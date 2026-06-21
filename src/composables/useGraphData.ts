import { computed, ref } from 'vue';
import * as vNG from 'v-network-graph';
import { CharacterNode } from '@/models/CharacterNode';
import { KnowEdge } from '@/models/KnowEdge';
import { KnowRelation } from '@/services/Models/KnowRelation';
import type { Character } from '@/services/Models/Character';
import type { VersionedCharacter } from '@/services/Models/VersionedCharacter';
import type { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';
import { EDGE_ID_SEPARATOR, type GraphSelection } from './useGraphSelection';

// Edge labels only show the opening of the description so long relation notes
// don't overflow the graph; the full text lives on the relation itself.
const DESCRIPTION_LABEL_MAX_LENGTH = 20;
function truncateDescription(description: string): string {
  if (description.length <= DESCRIPTION_LABEL_MAX_LENGTH) return description;
  return description.slice(0, DESCRIPTION_LABEL_MAX_LENGTH) + '…';
}

/**
 * Owns the graph's data — the list of character nodes and know-relation edges —
 * and projects it into the `Nodes` / `Edges` shapes that <v-network-graph>
 * renders. Also tracks the highlighted "path between two characters" overlay.
 *
 * All mutations the UI can trigger (create / update / delete a character or a
 * relation, set or clear the highlighted path) live here as named functions so
 * App.vue only has to wire component events to them.
 *
 * @param selection the shared {@link GraphSelection}; the rendered node/edge
 *   styling depends on which nodes are selected, and creating a character
 *   selects it.
 */
export function useGraphData(selection: GraphSelection) {
  const nodeList = ref<CharacterNode[]>([]);
  const edges = ref<KnowEdge[]>([]);

  // Ids of the characters on the currently highlighted relation path (the
  // result of "find path between A and B"), in order.
  const pathCharacterIds = ref<string[]>([]);

  const highlightedNodeIds = computed<Set<string>>(() => new Set(pathCharacterIds.value));
  const highlightedEdgeKeys = computed<Set<string>>(() => {
    const keys = new Set<string>();
    for (let i = 0; i < pathCharacterIds.value.length - 1; i++) {
      keys.add(pathCharacterIds.value[i]! + EDGE_ID_SEPARATOR + pathCharacterIds.value[i + 1]!);
    }
    return keys;
  });

  /** Character nodes shaped for <v-network-graph>, with selection/highlight flags. */
  const nodesForGraph = computed<vNG.Nodes>(() =>
    Object.fromEntries(
      nodeList.value.map((n) => [
        n.id,
        {
          name: n.name,
          highlighted: highlightedNodeIds.value.has(n.id),
          isFirstSelected: selection.firstSelectedNodeId.value === n.id,
          isSecondSelected: selection.secondSelectedNodeId.value === n.id,
        },
      ]),
    ),
  );

  /** Relation edges shaped for <v-network-graph>, with selection/highlight flags. */
  const edgesForGraph = computed<vNG.Edges>(() =>
    Object.fromEntries(
      edges.value.map((e) => {
        const key = e.source + EDGE_ID_SEPARATOR + e.target;
        const first = selection.firstSelectedNodeId.value;
        const second = selection.secondSelectedNodeId.value;
        const connectsSelected =
          !!first &&
          !!second &&
          ((e.source === first && e.target === second) ||
            (e.source === second && e.target === first));
        return [
          key,
          {
            source: e.source,
            target: e.target,
            highlighted: highlightedEdgeKeys.value.has(key),
            connectsSelected,
            isStrong: e.isStrongRelation,
            label: truncateDescription(e.description),
          },
        ];
      }),
    ),
  );

  /** Replace the whole graph from a freshly fetched list of characters. */
  function loadData(result: Character[]) {
    nodeList.value = result.map((c) => new CharacterNode(c));
    nodeList.value.forEach((n) => {
      n.characterData.knowCharacters.forEach((relation) => {
        edges.value.push(
          new KnowEdge(n.id, relation.characterId, relation.description, relation.isStrongRelation),
        );
      });
    });
  }

  /** Add a newly created character and select it. */
  function onCharacterCreated(node: CharacterNode) {
    nodeList.value.push(node);
    selection.firstSelectedNodeId.value = node.id;
  }

  /** Remove a deleted character from the graph. */
  function onCharacterDeleted(id: string) {
    const idx = nodeList.value.findIndex((n) => n.id === id);
    if (idx === -1) return;
    nodeList.value.splice(idx, 1);
  }

  /** Apply a character rename coming back from the update modal. */
  function onCharacterUpdated(updatedCharacter: VersionedCharacter) {
    const idx = nodeList.value.findIndex((n) => n.id === updatedCharacter.id);
    if (idx === -1) return;
    nodeList.value[idx]!.characterData.id = updatedCharacter.id;
    nodeList.value[idx]!.updateName(updatedCharacter.name);
  }

  /** Remove a deleted relation edge. */
  function onEdgeKnowDeleted(deletedEdgeId: string) {
    const [fromId, toId] = deletedEdgeId.split(EDGE_ID_SEPARATOR);
    const idx = edges.value.findIndex((n) => n.source === fromId && n.target === toId);
    if (idx === -1) return;
    edges.value.splice(idx, 1);
  }

  /** Add a newly created relation, both as an edge and on the source character. */
  function onEdgeKnowCreated(edge: KnowEdge) {
    const foundNodeIndex = nodeList.value.findIndex((n) => n.id === edge.source);
    if (foundNodeIndex === -1) return;
    nodeList.value[foundNodeIndex]!.characterData.knowCharacters.push(
      new KnowRelation(edge.target, edge.description, edge.isStrongRelation),
    );
    edges.value.push(edge);
  }

  /** Apply a relation edit (description / strength) to both edge and character. */
  function onKnowEdgeUpdated(relation: VersionedKnowRelation) {
    const edge = edges.value.find(
      (e) => e.source === relation.fromCharacterId && e.target === relation.toCharacterId,
    );
    if (edge) {
      edge.description = relation.description;
      edge.isStrongRelation = relation.isStrongRelation;
    }

    const node = nodeList.value.find((n) => n.id === relation.fromCharacterId);
    const knowRelation = node?.characterData.knowCharacters.find(
      (k) => k.characterId === relation.toCharacterId,
    );
    if (knowRelation) {
      knowRelation.description = relation.description;
      knowRelation.isStrongRelation = relation.isStrongRelation;
    }
  }

  /** Highlight the given ordered path of character ids. */
  function onPathFound(characterIds: string[]) {
    pathCharacterIds.value = characterIds;
  }

  /** Clear the highlighted relation path. */
  function clearHighlightedPath() {
    pathCharacterIds.value = [];
  }

  return {
    nodeList,
    edges,
    pathCharacterIds,
    nodesForGraph,
    edgesForGraph,
    loadData,
    onCharacterCreated,
    onCharacterDeleted,
    onCharacterUpdated,
    onEdgeKnowDeleted,
    onEdgeKnowCreated,
    onKnowEdgeUpdated,
    onPathFound,
    clearHighlightedPath,
  };
}

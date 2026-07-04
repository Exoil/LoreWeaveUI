import { computed, ref } from 'vue';
import * as vNG from 'v-network-graph';
import { CharacterNode } from '@/models/CharacterNode';
import { KnowEdge } from '@/models/KnowEdge';
import { FactNode } from '@/models/FactNode';
import { FactEdge } from '@/models/FactEdge';
import { KnowRelation } from '@/services/Models/KnowRelation';
import type { Character } from '@/services/Models/Character';
import type { VersionedCharacter } from '@/services/Models/VersionedCharacter';
import type { VersionedKnowRelation } from '@/services/Models/VersionedKnowRelation';
import type { Fact } from '@/services/Models/Fact';
import type { VersionedFact } from '@/services/Models/VersionedFact';
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
  const factNodeList = ref<FactNode[]>([]);
  const factEdges = ref<FactEdge[]>([]);

  /** Whether the given graph node id belongs to a fact node (vs. a character). */
  function isFactNode(id: string): boolean {
    return factNodeList.value.some((f) => f.id === id);
  }

  /** The domain {@link Fact} behind a fact-node id, or `undefined` for other ids. */
  function getFactById(id: string): Fact | undefined {
    return factNodeList.value.find((f) => f.id === id)?.factData;
  }

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

  /** Character + fact nodes shaped for <v-network-graph>, with selection/highlight flags. */
  const nodesForGraph = computed<vNG.Nodes>(() =>
    Object.fromEntries([
      ...nodeList.value.map((n) => [
        n.id,
        {
          name: n.name,
          highlighted: highlightedNodeIds.value.has(n.id),
          isFirstSelected: selection.firstSelectedNodeId.value === n.id,
          isSecondSelected: selection.secondSelectedNodeId.value === n.id,
        },
      ]),
      ...factNodeList.value.map((f) => [
        f.id,
        {
          name: f.name,
          isFact: true,
          isFactSelected: selection.selectedFactNodeId.value === f.id,
        },
      ]),
    ]),
  );

  /** Relation + fact edges shaped for <v-network-graph>, with selection/highlight flags. */
  const edgesForGraph = computed<vNG.Edges>(() =>
    Object.fromEntries([
      ...edges.value.map((e) => {
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
      ...factEdges.value.map((e) => [
        e.source + EDGE_ID_SEPARATOR + e.target,
        {
          source: e.source,
          target: e.target,
          isFactEdge: true,
        },
      ]),
    ]),
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

    // The same fact can be connected to several characters — one node per fact
    // id, one edge per character↔fact connection.
    const factsById = new Map<string, FactNode>();
    factNodeList.value = [];
    factEdges.value = [];
    nodeList.value.forEach((n) => {
      n.characterData.facts.forEach((fact) => {
        if (!factsById.has(fact.id)) {
          const factNode = new FactNode(fact);
          factsById.set(fact.id, factNode);
          factNodeList.value.push(factNode);
        }
        factEdges.value.push(new FactEdge(n.id, fact.id));
      });
    });
  }

  /** Add a newly created character and select it. */
  function onCharacterCreated(node: CharacterNode) {
    nodeList.value.push(node);
    selection.firstSelectedNodeId.value = node.id;
  }

  /** Remove a deleted character from the graph (with its fact connections). */
  function onCharacterDeleted(id: string) {
    const idx = nodeList.value.findIndex((n) => n.id === id);
    if (idx === -1) return;
    nodeList.value.splice(idx, 1);
    factEdges.value = factEdges.value.filter((e) => e.source !== id);
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

  /** Add a newly created fact: a new node connected to its character, and select it. */
  function onFactCreated(characterId: string, factNode: FactNode) {
    const node = nodeList.value.find((n) => n.id === characterId);
    if (!node) return;
    node.characterData.facts.push(factNode.factData);
    factNodeList.value.push(factNode);
    factEdges.value.push(new FactEdge(characterId, factNode.id));
    selection.selectedFactNodeId.value = factNode.id;
  }

  /** Apply a fact edit (title / content) coming back from the update modal. */
  function onFactUpdated(updatedFact: VersionedFact) {
    const factNode = factNodeList.value.find((f) => f.id === updatedFact.id);
    if (!factNode) return;
    factNode.updateFact(updatedFact.title, updatedFact.content);
  }

  /** Remove a deleted fact: its node, its edges, and its entries on characters. */
  function onFactDeleted(factId: string) {
    const idx = factNodeList.value.findIndex((f) => f.id === factId);
    if (idx === -1) return;
    factNodeList.value.splice(idx, 1);
    factEdges.value = factEdges.value.filter((e) => e.target !== factId);
    nodeList.value.forEach((n) => {
      n.characterData.facts = n.characterData.facts.filter((f) => f.id !== factId);
    });
  }

  /** Remove a disconnected character↔fact edge (the fact node itself stays). */
  function onFactEdgeDeleted(deletedEdgeId: string) {
    const [characterId, factId] = deletedEdgeId.split(EDGE_ID_SEPARATOR);
    const idx = factEdges.value.findIndex((e) => e.source === characterId && e.target === factId);
    if (idx === -1) return;
    factEdges.value.splice(idx, 1);

    const node = nodeList.value.find((n) => n.id === characterId);
    if (node) {
      node.characterData.facts = node.characterData.facts.filter((f) => f.id !== factId);
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
    factNodeList,
    factEdges,
    pathCharacterIds,
    nodesForGraph,
    edgesForGraph,
    isFactNode,
    getFactById,
    loadData,
    onCharacterCreated,
    onCharacterDeleted,
    onCharacterUpdated,
    onEdgeKnowDeleted,
    onEdgeKnowCreated,
    onKnowEdgeUpdated,
    onFactCreated,
    onFactUpdated,
    onFactDeleted,
    onFactEdgeDeleted,
    onPathFound,
    clearHighlightedPath,
  };
}

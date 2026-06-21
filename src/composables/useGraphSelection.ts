import { computed } from 'vue';
import { ref } from 'vue';

/**
 * Separator used to encode an edge id as `<fromId><sep><toId>`.
 * The graph identifies an edge by a single string, so the two endpoint
 * character ids are joined with this separator and split back out when a
 * relation needs to be addressed by its from/to ids.
 */
export const EDGE_ID_SEPARATOR = '_';

/**
 * Owns which nodes (characters) and edge (relation) are currently selected in
 * the graph, plus the small amount of derived state the UI needs from that
 * selection.
 *
 * Selection model:
 *  - Up to two nodes can be selected at once (`firstSelectedNodeId`,
 *    `secondSelectedNodeId`) — two are needed to create / inspect a relation.
 *  - At most one edge (`selectedEdgeId`).
 *
 * @returns selection refs, the v-network-graph `v-model` bindings
 *   (`selectedNodeIds` / `selectedEdgeIds`), the split edge endpoint ids, and a
 *   `clearSelection()` helper.
 */
export function useGraphSelection() {
  const firstSelectedNodeId = ref<string | null>(null);
  const secondSelectedNodeId = ref<string | null>(null);
  const selectedEdgeId = ref<string | undefined>(undefined);

  // v-network-graph emits a `view:click` right after a node/edge click; this
  // flag lets the click handlers swallow that one event so the selection they
  // just made isn't immediately cleared. See useGraphInteractions.
  const suppressNextViewClickClear = ref(false);

  // The selected edge id encodes its endpoints as `<from><sep><to>`; split it so
  // the update-relation modal can address the relation by its character ids.
  const selectedEdgeFromId = computed<string | null>(
    () => selectedEdgeId.value?.split(EDGE_ID_SEPARATOR)[0] ?? null,
  );
  const selectedEdgeToId = computed<string | null>(
    () => selectedEdgeId.value?.split(EDGE_ID_SEPARATOR)[1] ?? null,
  );

  // `v-model:selected-nodes` on <v-network-graph> is an array; bridge it to the
  // first/second single refs the rest of the app reasons about.
  const selectedNodeIds = computed<string[]>({
    get() {
      const selectedNodes = [];
      if (firstSelectedNodeId.value) {
        selectedNodes.push(firstSelectedNodeId.value);
      }
      if (secondSelectedNodeId.value) {
        selectedNodes.push(secondSelectedNodeId.value);
      }
      return selectedNodes;
    },
    set(ids) {
      const firstId = ids?.[0];
      const secondId = ids?.[1];
      if (firstId) {
        firstSelectedNodeId.value = firstId;
      }
      if (secondId) {
        secondSelectedNodeId.value = secondId;
      }
    },
  });

  const selectedEdgeIds = computed<string[]>({
    get() {
      return selectedEdgeId.value ? [selectedEdgeId.value] : [];
    },
    set(ids) {
      const next = ids?.[0];
      if (!next) {
        return;
      }
      selectedEdgeId.value = next;
    },
  });

  /** Deselect every node and edge. Called when the empty canvas is clicked. */
  function clearSelection() {
    selectedEdgeId.value = undefined;
    firstSelectedNodeId.value = null;
    secondSelectedNodeId.value = null;
  }

  return {
    firstSelectedNodeId,
    secondSelectedNodeId,
    selectedEdgeId,
    suppressNextViewClickClear,
    selectedEdgeFromId,
    selectedEdgeToId,
    selectedNodeIds,
    selectedEdgeIds,
    clearSelection,
  };
}

/** Return type of {@link useGraphSelection}, for passing the selection around. */
export type GraphSelection = ReturnType<typeof useGraphSelection>;

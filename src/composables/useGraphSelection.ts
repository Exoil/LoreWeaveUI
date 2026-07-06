import { computed } from 'vue';
import { ref } from 'vue';
import { EDGE_ID_SEPARATOR } from '@/models/GraphEdge';

// The separator lives with the edge model (its `key` is built from it);
// re-exported here because the selection API is where consumers historically
// import it from.
export { EDGE_ID_SEPARATOR };

export interface UseGraphSelectionOptions {
  /**
   * Tells the selection which node ids belong to fact nodes so they land in
   * `selectedFactNodeId` instead of the character pair slots. Defaults to
   * "no node is a fact".
   */
  isFactNodeId?: (id: string) => boolean;
}

/**
 * Owns which nodes (characters / facts) and edge (relation) are currently
 * selected in the graph, plus the small amount of derived state the UI needs
 * from that selection.
 *
 * Selection model:
 *  - Up to two character nodes can be selected at once (`firstSelectedNodeId`,
 *    `secondSelectedNodeId`) — two are needed to create / inspect a relation.
 *  - At most one fact node (`selectedFactNodeId`); fact ids are recognised via
 *    the `isFactNodeId` option and never occupy the character slots.
 *  - At most one edge (`selectedEdgeId`).
 *
 * @returns selection refs, the v-network-graph `v-model` bindings
 *   (`selectedNodeIds` / `selectedEdgeIds`), the split edge endpoint ids, and a
 *   `clearSelection()` helper.
 */
export function useGraphSelection(options: UseGraphSelectionOptions = {}) {
  const isFactNodeId = (id: string) => options.isFactNodeId?.(id) ?? false;

  const firstSelectedNodeId = ref<string | null>(null);
  const secondSelectedNodeId = ref<string | null>(null);
  const selectedFactNodeId = ref<string | null>(null);
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
  // first/second character refs (and the single fact ref) the rest of the app
  // reasons about.
  const selectedNodeIds = computed<string[]>({
    get() {
      const selectedNodes = [];
      if (firstSelectedNodeId.value) {
        selectedNodes.push(firstSelectedNodeId.value);
      }
      if (secondSelectedNodeId.value) {
        selectedNodes.push(secondSelectedNodeId.value);
      }
      if (selectedFactNodeId.value) {
        selectedNodes.push(selectedFactNodeId.value);
      }
      return selectedNodes;
    },
    set(ids) {
      const characterIds = (ids ?? []).filter((id) => !isFactNodeId(id));
      const factId = (ids ?? []).find((id) => isFactNodeId(id));
      const firstId = characterIds[0];
      const secondId = characterIds[1];
      if (firstId) {
        firstSelectedNodeId.value = firstId;
      }
      if (secondId) {
        secondSelectedNodeId.value = secondId;
      }
      if (factId) {
        selectedFactNodeId.value = factId;
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
    selectedFactNodeId.value = null;
  }

  return {
    firstSelectedNodeId,
    secondSelectedNodeId,
    selectedFactNodeId,
    isFactNodeId,
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

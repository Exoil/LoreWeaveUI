import type { Ref } from 'vue';
import * as vNG from 'v-network-graph';
import { type EdgeEvent, type NodeEvent } from 'v-network-graph';
import type { GraphSelection } from './useGraphSelection';

/** Minimal contract this composable needs from each context-menu component. */
export interface NodeContextMenuApi {
  showNodeContextMenu(params: NodeEvent<MouseEvent>): void;
}
export interface EdgeContextMenuApi {
  showEdgeContextMenu(params: EdgeEvent<MouseEvent>): void;
}
export interface ViewContextMenuApi {
  showViewContextMenu(params: vNG.ViewEvent<MouseEvent>): void;
}

/** Template refs to the three context-menu components, supplied by App.vue. */
export interface GraphMenus {
  node: Ref<NodeContextMenuApi | null>;
  edge: Ref<EdgeContextMenuApi | null>;
  view: Ref<ViewContextMenuApi | null>;
}

/**
 * Translates raw <v-network-graph> pointer events into selection changes and
 * context-menu openings, and bundles them into the `eventHandlers` object the
 * graph expects.
 *
 * It mutates the shared {@link GraphSelection} (left-click selects, right-click
 * builds up the one/two node selection a menu acts on) and calls into the
 * context-menu components via {@link GraphMenus}.
 *
 * @param selection shared selection state to read and update.
 * @param menus template refs to the node/edge/view context-menu components.
 * @returns `{ eventHandlers }` — bind to `<v-network-graph :event-handlers>`.
 */
export function useGraphInteractions(selection: GraphSelection, menus: GraphMenus) {
  function nodeClickHandler(nodeEvents: NodeEvent<MouseEvent>) {
    selection.suppressNextViewClickClear.value = true;
    selection.firstSelectedNodeId.value = nodeEvents.node;
  }

  function edgeClickHandler(edgeEvent: EdgeEvent<MouseEvent>) {
    selection.suppressNextViewClickClear.value = true;
    selection.selectedEdgeId.value = edgeEvent.edge;
  }

  function viewClickHandler() {
    if (selection.suppressNextViewClickClear.value) {
      selection.suppressNextViewClickClear.value = false;
      return;
    }
    selection.clearSelection();
  }

  function showNodeContextMenu(params: NodeEvent<MouseEvent>) {
    selection.suppressNextViewClickClear.value = true;
    const clickedId = params.node;

    // Build up to a two-node selection: first empty slot wins, re-clicking an
    // already-selected node is a no-op, otherwise the second slot is replaced.
    if (!selection.firstSelectedNodeId.value) {
      selection.firstSelectedNodeId.value = clickedId;
    } else if (selection.firstSelectedNodeId.value === clickedId) {
      // already first-selected: keep as is
    } else if (!selection.secondSelectedNodeId.value) {
      selection.secondSelectedNodeId.value = clickedId;
    } else if (selection.secondSelectedNodeId.value === clickedId) {
      // already second-selected: keep as is
    } else {
      selection.secondSelectedNodeId.value = clickedId;
    }

    menus.node.value?.showNodeContextMenu(params);
  }

  function showEdgeContextMenu(params: EdgeEvent<MouseEvent>) {
    selection.suppressNextViewClickClear.value = true;
    const clickedEdgeId = params.edge;
    if (!clickedEdgeId) {
      return;
    }
    selection.selectedEdgeId.value = clickedEdgeId;
    menus.edge.value?.showEdgeContextMenu(params);
  }

  function showViewContextMenu(params: vNG.ViewEvent<MouseEvent>) {
    selection.suppressNextViewClickClear.value = true;
    menus.view.value?.showViewContextMenu(params);
  }

  const eventHandlers: vNG.EventHandlers = {
    'node:click': nodeClickHandler,
    'edge:click': edgeClickHandler,
    'view:click': viewClickHandler,
    'node:contextmenu': showNodeContextMenu,
    'edge:contextmenu': showEdgeContextMenu,
    'view:contextmenu': showViewContextMenu,
  };

  return { eventHandlers };
}

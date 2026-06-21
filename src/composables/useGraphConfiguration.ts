import { reactive } from 'vue';
import * as vNG from 'v-network-graph';
import {
  type ForceEdgeDatum,
  ForceLayout,
  type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';

// --- Palette / sizing for nodes and edges ---------------------------------
const PATH_HIGHLIGHT_COLOR = '#a855f7';
const DEFAULT_NODE_COLOR = '#4466cc';
const DEFAULT_EDGE_COLOR = '#aaaaaa';
const FIRST_SELECTED_STROKE_COLOR = '#16a34a';
const SECOND_SELECTED_STROKE_COLOR = '#14532d';
const SELECTED_PAIR_EDGE_COLOR = '#22c55e';
const SELECTED_STROKE_WIDTH = 4;
const WEAK_EDGE_DASHARRAY = '6 4';
const DEFAULT_EDGE_WIDTH = 3;
const EMPHASIZED_EDGE_WIDTH = 6;

/**
 * Builds the full <v-network-graph> configuration: node/edge styling driven by
 * the per-node/edge flags from useGraphData, plus the d3-force layout that
 * positions nodes.
 *
 * Styling reacts to flags carried on each node/edge object:
 *  - nodes: `highlighted` (on a path), `isFirstSelected`, `isSecondSelected`.
 *  - edges: `connectsSelected` (joins the two selected nodes), `highlighted`
 *    (on a path), `isStrong` (solid vs. dashed weak relation).
 *
 * @returns `{ graphConfiguration }` — pass straight to `<v-network-graph :configs>`.
 */
export function useGraphConfiguration() {
  const graphConfiguration = reactive(vNG.getFullConfigs());

  graphConfiguration.node.selectable = 2;
  graphConfiguration.node.focusring.visible = false;
  graphConfiguration.node.normal.color = (node) =>
    node.highlighted ? PATH_HIGHLIGHT_COLOR : DEFAULT_NODE_COLOR;
  graphConfiguration.node.normal.strokeWidth = (node) =>
    node.isFirstSelected || node.isSecondSelected ? SELECTED_STROKE_WIDTH : 0;
  graphConfiguration.node.normal.strokeColor = (node) => {
    if (node.isSecondSelected) return SECOND_SELECTED_STROKE_COLOR;
    if (node.isFirstSelected) return FIRST_SELECTED_STROKE_COLOR;
    return undefined;
  };
  graphConfiguration.edge.selectable = 1;
  graphConfiguration.edge.normal.color = (edge) => {
    if (edge.connectsSelected) return SELECTED_PAIR_EDGE_COLOR;
    if (edge.highlighted) return PATH_HIGHLIGHT_COLOR;
    return DEFAULT_EDGE_COLOR;
  };
  graphConfiguration.edge.normal.width = (edge) =>
    edge.connectsSelected || edge.highlighted ? EMPHASIZED_EDGE_WIDTH : DEFAULT_EDGE_WIDTH;
  // Weak relations render as a dashed line; strong relations stay solid.
  graphConfiguration.edge.normal.dasharray = (edge) =>
    edge.isStrong ? undefined : WEAK_EDGE_DASHARRAY;
  graphConfiguration.edge.type = 'straight';
  graphConfiguration.edge.marker.source.type = 'none';
  graphConfiguration.edge.marker.target.type = 'arrow';
  graphConfiguration.view.grid.visible = true;
  graphConfiguration.view.grid.interval = 10;
  graphConfiguration.view.grid.thickIncrements = 5;
  graphConfiguration.view.grid.line.color = '#e0e0e0';
  graphConfiguration.view.grid.line.width = 1;
  graphConfiguration.view.grid.line.dasharray = 1;
  graphConfiguration.view.grid.thick.color = '#cccccc';
  graphConfiguration.view.grid.thick.width = 1;
  graphConfiguration.view.grid.thick.dasharray = 0;
  graphConfiguration.view.layoutHandler = new ForceLayout({
    positionFixedByDrag: true, // lock node after dragging
    positionFixedByClickWithAltKey: true,
    createSimulation: (d3, nodes, edges) => {
      const forceLink = d3
        .forceLink<ForceNodeDatum, ForceEdgeDatum>(edges)
        .id((d: { id: string }) => d.id);

      /**
       * Controls the ideal length and stiffness of edges between connected nodes.
       * - distance: target edge length in pixels
       * - strength: how hard the spring pulls nodes to that distance (0–1)
       */
      const createEdgeSpringForce = (distance: number, strength: number) =>
        forceLink.distance(distance).strength(strength);

      /**
       * Makes every node repel every other node, like same-pole magnets.
       * Use negative values for repulsion — the larger the absolute value, the more spread out nodes become.
       */
      const createNodeRepulsionForce = (strength: number) => d3.forceManyBody().strength(strength);

      /**
       * Pulls all nodes gently toward the center of the viewport.
       * Keep strength low (e.g. 0.05) so it doesn't fight other forces.
       */
      const createCenteringForce = (strength: number) => d3.forceCenter().strength(strength);

      /**
       * Prevents nodes from overlapping by enforcing a minimum distance between node centers.
       * - radius: minimum distance in pixels (should be >= your node's visual radius)
       */
      const createCollisionForce = (radius: number) => d3.forceCollide(radius);

      return (
        d3
          .forceSimulation(nodes)
          .force('edge', createEdgeSpringForce(120, 0.5))
          .force('charge', createNodeRepulsionForce(-200))
          .force('center', createCenteringForce(0.05))
          .force('collide', createCollisionForce(60))
          /**
           * alphaMin: the cooling threshold at which the simulation stops.
           * Alpha starts at 1.0 and decays each tick toward this value.
           * Lower = runs longer and settles more accurately.
           * Higher = stops sooner (faster but less precise layout).
           */
          .alphaMin(0.001)
      );
    },
  });
  graphConfiguration.edge.keepOrder = 'clock';

  return { graphConfiguration };
}

import { reactive } from 'vue';
import * as vNG from 'v-network-graph';
import {
  type ForceEdgeDatum,
  ForceLayout,
  type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';

// --- Palette / sizing for nodes and edges ---------------------------------
/**
 * Every colour the graph renders with, exported so the on-screen legend
 * (GraphLegendComponent) can never drift from the actual styling. The
 * `hidden*` entries are the GM-only washed-out variants of items hidden
 * from players.
 */
export const GRAPH_PALETTE = {
  characterNode: '#4466cc',
  factNode: '#d97706',
  pathHighlight: '#a855f7',
  firstSelectedStroke: '#16a34a',
  secondSelectedStroke: '#14532d',
  factSelectedStroke: '#92400e',
  relationEdge: '#aaaaaa',
  selectedPairEdge: '#22c55e',
  factEdge: '#d9a066',
  hiddenNode: '#b6c2e3',
  hiddenFactNode: '#ecd3ab',
  hiddenEdge: '#dddddd',
} as const;

/** Weak relations render dashed (strong stay solid); exported for the legend. */
export const WEAK_EDGE_DASHARRAY = '6 4';
/** Character→fact connections render dotted; exported for the legend. */
export const FACT_EDGE_DASHARRAY = '2 3';

const SELECTED_STROKE_WIDTH = 4;
const DEFAULT_EDGE_WIDTH = 3;
const EMPHASIZED_EDGE_WIDTH = 6;
const FACT_NODE_RADIUS = 12;
const DEFAULT_NODE_RADIUS = 16;
const FACT_EDGE_WIDTH = 2;

export interface UseGraphConfigurationOptions {
  canEditLayout?: boolean;
}

/**
 * Builds the full <v-network-graph> configuration: node/edge styling driven by
 * the per-node/edge flags from useGraphData, plus the d3-force layout that
 * positions nodes.
 *
 * Styling reacts to flags carried on each node/edge object:
 *  - nodes: `highlighted` (on a path), `isFirstSelected`, `isSecondSelected`,
 *    `isFact` / `isFactSelected` (smaller amber fact nodes), `isHidden`
 *    (GM-only faded rendering of items hidden from players).
 *  - edges: `connectsSelected` (joins the two selected nodes), `highlighted`
 *    (on a path), `isStrong` (solid vs. dashed weak relation), `isFactEdge`
 *    (thin dotted character→fact connection), `isHidden` (GM-only faded).
 *
 * @param options.canEditLayout whether the user may drag nodes around
 *   (default true). Players are view-only: the GM's arrangement is synced to
 *   them, so their own dragging is disabled.
 * @returns `{ graphConfiguration }` — pass straight to `<v-network-graph :configs>`.
 */
export function useGraphConfiguration(options: UseGraphConfigurationOptions = {}) {
  const graphConfiguration = reactive(vNG.getFullConfigs());

  // Fact nodes may join the selection alongside the two characters.
  graphConfiguration.node.selectable = 3;
  graphConfiguration.node.draggable = options.canEditLayout ?? true;
  graphConfiguration.node.focusring.visible = false;
  graphConfiguration.node.normal.radius = (node) =>
    node.isFact ? FACT_NODE_RADIUS : DEFAULT_NODE_RADIUS;
  graphConfiguration.node.normal.color = (node) => {
    if (node.isHidden) return node.isFact ? GRAPH_PALETTE.hiddenFactNode : GRAPH_PALETTE.hiddenNode;
    if (node.isFact) return GRAPH_PALETTE.factNode;
    return node.highlighted ? GRAPH_PALETTE.pathHighlight : GRAPH_PALETTE.characterNode;
  };
  graphConfiguration.node.normal.strokeWidth = (node) =>
    node.isFirstSelected || node.isSecondSelected || node.isFactSelected
      ? SELECTED_STROKE_WIDTH
      : 0;
  graphConfiguration.node.normal.strokeColor = (node) => {
    if (node.isFactSelected) return GRAPH_PALETTE.factSelectedStroke;
    if (node.isSecondSelected) return GRAPH_PALETTE.secondSelectedStroke;
    if (node.isFirstSelected) return GRAPH_PALETTE.firstSelectedStroke;
    return undefined;
  };
  graphConfiguration.edge.selectable = 1;
  graphConfiguration.edge.normal.color = (edge) => {
    if (edge.isHidden) return GRAPH_PALETTE.hiddenEdge;
    if (edge.isFactEdge) return GRAPH_PALETTE.factEdge;
    if (edge.connectsSelected) return GRAPH_PALETTE.selectedPairEdge;
    if (edge.highlighted) return GRAPH_PALETTE.pathHighlight;
    return GRAPH_PALETTE.relationEdge;
  };
  graphConfiguration.edge.normal.width = (edge) => {
    if (edge.isFactEdge) return FACT_EDGE_WIDTH;
    return edge.connectsSelected || edge.highlighted ? EMPHASIZED_EDGE_WIDTH : DEFAULT_EDGE_WIDTH;
  };
  // Weak relations render as a dashed line; strong relations stay solid.
  // Fact connections use a distinct dotted pattern.
  graphConfiguration.edge.normal.dasharray = (edge) => {
    if (edge.isFactEdge) return FACT_EDGE_DASHARRAY;
    return edge.isStrong ? undefined : WEAK_EDGE_DASHARRAY;
  };
  // A mutual relation (A knows B and B knows A) is two directed edges between
  // the same pair. Curved edges + a gap arc them away from each other so both
  // lines and their description labels stay readable; summarize is off so the
  // pair is never collapsed into a single counted line.
  graphConfiguration.edge.type = 'curve';
  graphConfiguration.edge.gap = 24;
  graphConfiguration.edge.summarize = false;
  graphConfiguration.edge.marker.source.type = 'none';
  graphConfiguration.edge.marker.target.type = 'arrow';
  // Zoom scales the whole scene (nodes, edge widths, gaps, labels) together
  // like a map. The default (false) keeps objects at constant screen size and
  // only scales the distances, so zooming out crushes fixed-size edges and
  // labels into each other.
  graphConfiguration.view.scalingObjects = true;
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

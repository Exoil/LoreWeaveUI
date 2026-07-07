import { computed, reactive, watch, type ComputedRef, type Ref } from 'vue';
import * as vNG from 'v-network-graph';
import {
  type ForceEdgeDatum,
  ForceLayout,
  type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout';
import type { BoardConfiguration } from '@/services/Models/BoardConfiguration';

// --- Palette / sizing for nodes and edges ---------------------------------
/** Every colour the graph renders with; the legend consumes the same object. */
export interface GraphPalette {
  characterNode: string;
  factNode: string;
  pathHighlight: string;
  firstSelectedStroke: string;
  secondSelectedStroke: string;
  factSelectedStroke: string;
  relationEdge: string;
  selectedPairEdge: string;
  factEdge: string;
  hiddenNode: string;
  hiddenFactNode: string;
  hiddenEdge: string;
}

/**
 * The palette the graph renders with when the board carries no configuration
 * (or none is provided). Per-board colours from {@link BoardConfiguration}
 * override the base colours; the `hidden*` entries are the GM-only washed-out
 * variants of items hidden from players, derived from the base colours so
 * they follow the GM's choices.
 */
export const GRAPH_PALETTE: GraphPalette = {
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
const DEFAULT_NODE_RADIUS = 16;

/** How much white is mixed into a colour to get its GM-only "hidden" variant. */
const HIDDEN_WASH_RATIO = 0.6;

/** Mix a `#rrggbb` colour toward white — the washed-out "hidden" rendering. */
export function washOutColor(hex: string, ratio: number = HIDDEN_WASH_RATIO): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * ratio);
  const r = mix((value >> 16) & 0xff);
  const g = mix((value >> 8) & 0xff);
  const b = mix(value & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Per-board sizing derived from {@link BoardConfiguration} (or the defaults). */
interface GraphSizing {
  nodeRadius: number;
  factNodeRadius: number;
  edgeWidth: number;
  emphasizedEdgeWidth: number;
  factEdgeWidth: number;
}

function toSizing(nodeRadius: number, edgeWidth: number): GraphSizing {
  return {
    nodeRadius,
    // Fact nodes stay visually subordinate to character nodes.
    factNodeRadius: Math.max(4, Math.round(nodeRadius * 0.75)),
    edgeWidth,
    emphasizedEdgeWidth: edgeWidth * 2,
    factEdgeWidth: Math.max(1, Math.round((edgeWidth * 2) / 3)),
  };
}

export interface UseGraphConfigurationOptions {
  canEditLayout?: boolean;
  /**
   * Reactive per-board configuration (colours + view options set by the GM in
   * the board-settings dialog). `null`/absent falls back to the defaults.
   */
  boardConfiguration?: Ref<BoardConfiguration | null>;
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
 * @param options.boardConfiguration reactive per-board colours/options; the
 *   styling (and the exported `palette`) follows it live.
 * @returns `{ graphConfiguration, palette }` — the configs for
 *   `<v-network-graph :configs>` plus the effective palette for the legend.
 */
export function useGraphConfiguration(options: UseGraphConfigurationOptions = {}) {
  const graphConfiguration = reactive(vNG.getFullConfigs());

  /**
   * The colours the graph currently renders with: board overrides on top of
   * the defaults, with the GM-only hidden variants derived from the base
   * colours. The legend consumes this so it can never drift from the styling.
   */
  const palette: ComputedRef<GraphPalette> = computed(() => {
    const config = options.boardConfiguration?.value;
    if (!config) return GRAPH_PALETTE;
    return {
      ...GRAPH_PALETTE,
      characterNode: config.characterNodeColor,
      factNode: config.factNodeColor,
      pathHighlight: config.pathHighlightColor,
      relationEdge: config.relationEdgeColor,
      factEdge: config.factEdgeColor,
      hiddenNode: washOutColor(config.characterNodeColor),
      hiddenFactNode: washOutColor(config.factNodeColor),
    };
  });

  const sizing: ComputedRef<GraphSizing> = computed(() => {
    const config = options.boardConfiguration?.value;
    return toSizing(
      config?.nodeRadius ?? DEFAULT_NODE_RADIUS,
      config?.edgeWidth ?? DEFAULT_EDGE_WIDTH,
    );
  });

  /**
   * (Re)assign every palette/sizing-dependent config entry. Called on setup
   * and whenever the board configuration changes: reassigning the function
   * properties (fresh closures over the new snapshot) is what lets
   * v-network-graph notice the change — it does not re-invoke old closures
   * when an outer ref they read mutates.
   */
  function applyBoardStyling(colors: GraphPalette, sizes: GraphSizing): void {
    graphConfiguration.node.normal.radius = (node) =>
      node.isFact ? sizes.factNodeRadius : sizes.nodeRadius;
    graphConfiguration.node.normal.color = (node) => {
      if (node.isHidden) return node.isFact ? colors.hiddenFactNode : colors.hiddenNode;
      if (node.isFact) return colors.factNode;
      return node.highlighted ? colors.pathHighlight : colors.characterNode;
    };
    graphConfiguration.node.normal.strokeColor = (node) => {
      if (node.isFactSelected) return colors.factSelectedStroke;
      if (node.isSecondSelected) return colors.secondSelectedStroke;
      if (node.isFirstSelected) return colors.firstSelectedStroke;
      return undefined;
    };
    graphConfiguration.edge.normal.color = (edge) => {
      if (edge.isHidden) return colors.hiddenEdge;
      if (edge.isFactEdge) return colors.factEdge;
      if (edge.connectsSelected) return colors.selectedPairEdge;
      if (edge.highlighted) return colors.pathHighlight;
      return colors.relationEdge;
    };
    graphConfiguration.edge.normal.width = (edge) => {
      if (edge.isFactEdge) return sizes.factEdgeWidth;
      return edge.connectsSelected || edge.highlighted
        ? sizes.emphasizedEdgeWidth
        : sizes.edgeWidth;
    };
  }

  // Fact nodes may join the selection alongside the two characters.
  graphConfiguration.node.selectable = 3;
  graphConfiguration.node.draggable = options.canEditLayout ?? true;
  graphConfiguration.node.focusring.visible = false;
  graphConfiguration.node.normal.strokeWidth = (node) =>
    node.isFirstSelected || node.isSecondSelected || node.isFactSelected
      ? SELECTED_STROKE_WIDTH
      : 0;
  graphConfiguration.edge.selectable = 1;
  // Weak relations render as a dashed line; strong relations stay solid.
  // Fact connections use a distinct dotted pattern.
  graphConfiguration.edge.normal.dasharray = (edge) => {
    if (edge.isFactEdge) return FACT_EDGE_DASHARRAY;
    return edge.isStrong ? undefined : WEAK_EDGE_DASHARRAY;
  };
  // A mutual relation (A knows B and B knows A) is two directed edges between
  // the same pair. Curved edges + a gap arc them away from each other so both
  // lines and their description labels stay readable (the GM may switch to
  // straight lines per board); summarize is off so the pair is never collapsed
  // into a single counted line.
  graphConfiguration.edge.gap = 24;
  graphConfiguration.edge.summarize = false;
  graphConfiguration.edge.marker.source.type = 'none';
  graphConfiguration.edge.marker.target.type = 'arrow';
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

  // Palette, sizing and the scalar view options follow the board
  // configuration live — the GM sees a save reflected without reopening.
  watch(
    [palette, sizing, () => options.boardConfiguration?.value] as const,
    ([colors, sizes, config]) => {
      applyBoardStyling(colors, sizes);
      graphConfiguration.edge.type = (config?.curvedEdges ?? true) ? 'curve' : 'straight';
      graphConfiguration.view.grid.visible = config?.showGrid ?? true;
      // Zoom scales the whole scene (nodes, edge widths, gaps, labels)
      // together like a map. `false` keeps objects at constant screen size
      // and only scales the distances, so zooming out crushes fixed-size
      // edges and labels into each other.
      graphConfiguration.view.scalingObjects = config?.scalingObjects ?? true;
    },
    { immediate: true },
  );

  return { graphConfiguration, palette };
}

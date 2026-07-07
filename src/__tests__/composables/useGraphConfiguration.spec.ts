import { describe, it, expect } from 'vitest';
import { nextTick, ref } from 'vue';
import {
  GRAPH_PALETTE,
  useGraphConfiguration,
  washOutColor,
} from '@/composables/useGraphConfiguration';
import { BoardConfiguration } from '@/services/Models/BoardConfiguration';

describe('useGraphConfiguration', () => {
  // A mutual relation is two directed edges between the same node pair; these
  // settings keep them (and their labels) visually separated and readable.
  it('draws parallel edges as curves separated by a gap', () => {
    const { graphConfiguration } = useGraphConfiguration();

    expect(graphConfiguration.edge.type).toBe('curve');
    expect(graphConfiguration.edge.gap).toBeGreaterThanOrEqual(16);
  });

  it('never summarizes multiple edges between the same pair', () => {
    const { graphConfiguration } = useGraphConfiguration();

    expect(graphConfiguration.edge.summarize).toBe(false);
  });

  it('scales objects together with distances when zooming', () => {
    const { graphConfiguration } = useGraphConfiguration();

    expect(graphConfiguration.view.scalingObjects).toBe(true);
  });

  it('keeps directed arrows on the target end', () => {
    const { graphConfiguration } = useGraphConfiguration();

    expect(graphConfiguration.edge.marker.target.type).toBe('arrow');
    expect(graphConfiguration.edge.marker.source.type).toBe('none');
  });

  it('uses the default palette when no board configuration is provided', () => {
    const { palette } = useGraphConfiguration();

    expect(palette.value).toEqual(GRAPH_PALETTE);
  });

  it('applies a board configuration to palette, sizing and view options', async () => {
    const config = ref<BoardConfiguration | null>(null);
    const { graphConfiguration, palette } = useGraphConfiguration({ boardConfiguration: config });

    // Starts on the defaults while the board is still loading.
    expect(palette.value.characterNode).toBe(GRAPH_PALETTE.characterNode);
    expect(graphConfiguration.edge.type).toBe('curve');

    const custom = BoardConfiguration.createDefault();
    custom.characterNodeColor = '#112233';
    custom.relationEdgeColor = '#445566';
    custom.nodeRadius = 24;
    custom.edgeWidth = 5;
    custom.curvedEdges = false;
    custom.showGrid = false;
    custom.scalingObjects = false;
    config.value = custom;
    await nextTick();

    expect(palette.value.characterNode).toBe('#112233');
    expect(palette.value.relationEdge).toBe('#445566');
    // Hidden variants are derived (washed out), never the raw colour.
    expect(palette.value.hiddenNode).toBe(washOutColor('#112233'));

    expect(graphConfiguration.edge.type).toBe('straight');
    expect(graphConfiguration.view.grid.visible).toBe(false);
    expect(graphConfiguration.view.scalingObjects).toBe(false);

    const radius = graphConfiguration.node.normal.radius as unknown as (
      node: Record<string, unknown>,
    ) => number;
    expect(radius({ isFact: false })).toBe(24);
    expect(radius({ isFact: true })).toBe(18);

    const nodeColor = graphConfiguration.node.normal.color as unknown as (
      node: Record<string, unknown>,
    ) => string;
    expect(nodeColor({})).toBe('#112233');

    const edgeWidth = graphConfiguration.edge.normal.width as unknown as (
      edge: Record<string, unknown>,
    ) => number;
    expect(edgeWidth({})).toBe(5);
    expect(edgeWidth({ highlighted: true })).toBe(10);
  });

  it('washOutColor mixes toward white and leaves non-hex input alone', () => {
    expect(washOutColor('#000000')).toBe('#999999');
    expect(washOutColor('#ffffff')).toBe('#ffffff');
    expect(washOutColor('not-a-colour')).toBe('not-a-colour');
  });
});

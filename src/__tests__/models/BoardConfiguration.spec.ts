import { describe, it, expect } from 'vitest';
import { BoardConfiguration } from '@/services/Models/BoardConfiguration';
import { GRAPH_PALETTE } from '@/composables/useGraphConfiguration';

describe('BoardConfiguration', () => {
  it('createDefault matches the graph default palette and options', () => {
    const config = BoardConfiguration.createDefault();

    expect(config.characterNodeColor).toBe(GRAPH_PALETTE.characterNode);
    expect(config.factNodeColor).toBe(GRAPH_PALETTE.factNode);
    expect(config.relationEdgeColor).toBe(GRAPH_PALETTE.relationEdge);
    expect(config.factEdgeColor).toBe(GRAPH_PALETTE.factEdge);
    expect(config.pathHighlightColor).toBe(GRAPH_PALETTE.pathHighlight);
    expect(config.nodeRadius).toBe(16);
    expect(config.edgeWidth).toBe(3);
    expect(config.curvedEdges).toBe(true);
    expect(config.showGrid).toBe(true);
    expect(config.scalingObjects).toBe(true);
  });

  it('clone is an independent copy', () => {
    const original = BoardConfiguration.createDefault();
    const copy = original.clone();

    copy.characterNodeColor = '#112233';
    copy.nodeRadius = 30;

    expect(original.characterNodeColor).toBe(GRAPH_PALETTE.characterNode);
    expect(original.nodeRadius).toBe(16);
    expect(copy.characterNodeColor).toBe('#112233');
    expect(copy.nodeRadius).toBe(30);
  });
});

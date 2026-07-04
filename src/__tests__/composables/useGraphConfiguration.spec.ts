import { describe, it, expect } from 'vitest';
import { useGraphConfiguration } from '@/composables/useGraphConfiguration';

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
});

import { describe, it, expect, vi } from 'vitest';
import { useGraphData } from '@/composables/useGraphData';
import { useGraphSelection } from '@/composables/useGraphSelection';
import {
  useGraphVisibility,
  type GraphVisibilityHost,
  type HiddenGraphItems,
} from '@/composables/useGraphVisibility';
import { Character } from '@/services/Models/Character';
import { KnowRelation } from '@/services/Models/KnowRelation';
import { Fact } from '@/services/Models/Fact';

function makeHost(isGameMaster: boolean, saved: HiddenGraphItems | null = null) {
  return {
    isGameMaster,
    load: vi.fn().mockReturnValue(saved),
    save: vi.fn(),
  } satisfies GraphVisibilityHost;
}

// Two characters knowing each other, one fact on char-1.
function loadSampleGraph(graph: ReturnType<typeof useGraphData>) {
  graph.loadData([
    new Character(
      'char-1',
      'Alice',
      [new KnowRelation('char-2', 'friend', true)],
      [new Fact('fact-1', 'Secret', 'Alice has a secret')],
    ),
    new Character('char-2', 'Bob', []),
  ]);
}

function makeGraph(isGameMaster: boolean, saved: HiddenGraphItems | null = null) {
  const selection = useGraphSelection();
  const visibility = useGraphVisibility(makeHost(isGameMaster, saved));
  const graph = useGraphData(selection, visibility);
  loadSampleGraph(graph);
  return { graph, visibility };
}

describe('useGraphData × visibility (GM view)', () => {
  it('keeps hidden nodes and edges, flagged isHidden, for the GM', () => {
    const { graph } = makeGraph(true, {
      nodeIds: ['char-2'],
      edgeKeys: ['char-1_fact-1'],
    });

    expect(Object.keys(graph.nodesForGraph.value)).toEqual(
      expect.arrayContaining(['char-1', 'char-2', 'fact-1']),
    );
    expect(graph.nodesForGraph.value['char-2']!.isHidden).toBe(true);
    expect(graph.nodesForGraph.value['char-1']!.isHidden).toBe(false);
    // The relation touches hidden char-2, the fact edge is hidden directly.
    expect(graph.edgesForGraph.value['char-1_char-2']!.isHidden).toBe(true);
    expect(graph.edgesForGraph.value['char-1_fact-1']!.isHidden).toBe(true);
  });
});

describe('useGraphData × visibility (player view)', () => {
  it('shows everything when nothing is hidden', () => {
    const { graph } = makeGraph(false);

    expect(Object.keys(graph.nodesForGraph.value).sort()).toEqual(['char-1', 'char-2', 'fact-1']);
    expect(Object.keys(graph.edgesForGraph.value).sort()).toEqual([
      'char-1_char-2',
      'char-1_fact-1',
    ]);
  });

  it('drops a hidden character and every edge touching it', () => {
    const { graph } = makeGraph(false, { nodeIds: ['char-2'], edgeKeys: [] });

    expect(graph.nodesForGraph.value['char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
    // The fact connection to visible char-1 stays.
    expect(graph.edgesForGraph.value['char-1_fact-1']).toBeDefined();
  });

  it('hiding a node drops its outgoing relations and fact connections too', () => {
    // char-1 is the *source* of both edges in the sample graph.
    const { graph } = makeGraph(false, { nodeIds: ['char-1'], edgeKeys: [] });

    expect(graph.nodesForGraph.value['char-1']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_fact-1']).toBeUndefined();
    // The other endpoints stay visible.
    expect(graph.nodesForGraph.value['char-2']).toBeDefined();
    expect(graph.nodesForGraph.value['fact-1']).toBeDefined();
  });

  it('hiding a node drops both directions of a mutual relation', () => {
    const selection = useGraphSelection();
    const visibility = useGraphVisibility(makeHost(false, { nodeIds: ['char-1'], edgeKeys: [] }));
    const graph = useGraphData(selection, visibility);
    graph.loadData([
      new Character('char-1', 'Alice', [new KnowRelation('char-2', 'friend', true)]),
      new Character('char-2', 'Bob', [new KnowRelation('char-1', 'rival', false)]),
    ]);

    // Outgoing from the hidden node and incoming to it are both gone.
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-2_char-1']).toBeUndefined();
    expect(graph.nodesForGraph.value['char-2']).toBeDefined();
  });

  it('drops a hidden fact node and its connections', () => {
    const { graph } = makeGraph(false, { nodeIds: ['fact-1'], edgeKeys: [] });

    expect(graph.nodesForGraph.value['fact-1']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_fact-1']).toBeUndefined();
    expect(graph.nodesForGraph.value['char-1']).toBeDefined();
  });

  it('drops an individually hidden edge but keeps its endpoints', () => {
    const { graph } = makeGraph(false, { nodeIds: [], edgeKeys: ['char-1_char-2'] });

    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
    expect(graph.nodesForGraph.value['char-1']).toBeDefined();
    expect(graph.nodesForGraph.value['char-2']).toBeDefined();
  });

  it('reacts when the GM hides a node while the player window is open', () => {
    const selection = useGraphSelection();
    let push: ((items: HiddenGraphItems) => void) | undefined;
    const host: GraphVisibilityHost = {
      ...makeHost(false),
      subscribe(onChange) {
        push = onChange;
        return () => undefined;
      },
    };
    const graph = useGraphData(selection, useGraphVisibility(host));
    loadSampleGraph(graph);
    expect(graph.nodesForGraph.value['char-2']).toBeDefined();

    push!({ nodeIds: ['char-2'], edgeKeys: [] });

    expect(graph.nodesForGraph.value['char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
  });
});

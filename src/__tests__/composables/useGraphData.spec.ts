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

describe('useGraphData loadData', () => {
  it('reloading replaces the graph instead of duplicating edges', () => {
    const { graph } = makeGraph(true);

    // Second load with the same data (e.g. refresh after a Foundry sync).
    loadSampleGraph(graph);

    expect(graph.edges.value).toHaveLength(1);
    expect(Object.keys(graph.edgesForGraph.value).sort()).toEqual([
      'char-1_char-2',
      'char-1_fact-1',
    ]);
  });
});

describe('useGraphData onCharacterSynced', () => {
  it('adds an unknown character without touching the selection', () => {
    const selection = useGraphSelection();
    const graph = useGraphData(selection, useGraphVisibility(makeHost(true)));
    loadSampleGraph(graph);

    graph.onCharacterSynced('char-9', 'Saruman');

    expect(graph.nodesForGraph.value['char-9']!.name).toBe('Saruman');
    expect(selection.firstSelectedNodeId.value).toBeNull();
  });

  it('renames an already known character instead of duplicating it', () => {
    const { graph } = makeGraph(true);

    graph.onCharacterSynced('char-1', 'Alice the Grey');

    expect(graph.nodeList.value.filter((n) => n.id === 'char-1')).toHaveLength(1);
    expect(graph.nodesForGraph.value['char-1']!.name).toBe('Alice the Grey');
    // The wrapped domain model follows too.
    expect(graph.nodeList.value[0]!.characterData.name).toBe('Alice the Grey');
  });
});

describe('useGraphData onFactSynced', () => {
  it('adds an unknown fact with its connection edge to the anchoring character', () => {
    const { graph } = makeGraph(true);

    graph.onFactSynced(new Fact('fact-9', 'Handout', 'Secret lore'), 'char-2');

    expect(graph.nodesForGraph.value['fact-9']!.name).toBe('Handout');
    expect(graph.edgesForGraph.value['char-2_fact-9']).toBeDefined();
    expect(graph.getCharacterIdsConnectedToFact('fact-9')).toEqual(['char-2']);
  });

  it('edits an already known fact in place instead of recreating the node', () => {
    const { graph } = makeGraph(true);
    const nodeBefore = graph.factNodeList.value.find((f) => f.id === 'fact-1');

    graph.onFactSynced(new Fact('fact-1', 'New title', 'New content'));

    const nodeAfter = graph.factNodeList.value.find((f) => f.id === 'fact-1');
    expect(nodeAfter).toBe(nodeBefore); // same object — updated, not recreated
    expect(nodeAfter!.name).toBe('New title');
    expect(nodeAfter!.factData.content).toBe('New content');
    expect(graph.factNodeList.value.filter((f) => f.id === 'fact-1')).toHaveLength(1);
  });
});

describe('useGraphData × visibility (GM view)', () => {
  it('keeps hidden nodes and edges, flagged isHidden, for the GM', () => {
    const { graph } = makeGraph(true, { keys: ['char-2', 'char-1_fact-1'] });

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
    const { graph } = makeGraph(false, { keys: ['char-2'] });

    expect(graph.nodesForGraph.value['char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
    // The fact connection to visible char-1 stays.
    expect(graph.edgesForGraph.value['char-1_fact-1']).toBeDefined();
  });

  it('hiding a node drops its outgoing relations and fact connections too', () => {
    // char-1 is the *source* of both edges in the sample graph.
    const { graph } = makeGraph(false, { keys: ['char-1'] });

    expect(graph.nodesForGraph.value['char-1']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_fact-1']).toBeUndefined();
    // The other endpoints stay visible.
    expect(graph.nodesForGraph.value['char-2']).toBeDefined();
    expect(graph.nodesForGraph.value['fact-1']).toBeDefined();
  });

  it('hiding a node drops both directions of a mutual relation', () => {
    const selection = useGraphSelection();
    const visibility = useGraphVisibility(makeHost(false, { keys: ['char-1'] }));
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
    const { graph } = makeGraph(false, { keys: ['fact-1'] });

    expect(graph.nodesForGraph.value['fact-1']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_fact-1']).toBeUndefined();
    expect(graph.nodesForGraph.value['char-1']).toBeDefined();
  });

  it('drops an individually hidden edge but keeps its endpoints', () => {
    const { graph } = makeGraph(false, { keys: ['char-1_char-2'] });

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

    push!({ keys: ['char-2'] });

    expect(graph.nodesForGraph.value['char-2']).toBeUndefined();
    expect(graph.edgesForGraph.value['char-1_char-2']).toBeUndefined();
  });
});

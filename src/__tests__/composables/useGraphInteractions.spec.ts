import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { EdgeEvent, NodeEvent } from 'v-network-graph';
import {
  useGraphInteractions,
  type FactTooltipApi,
  type GraphMenus,
} from '@/composables/useGraphInteractions';
import { useGraphSelection } from '@/composables/useGraphSelection';

// Fact nodes are recognised by id prefix in these tests.
function makeSelection() {
  return useGraphSelection({ isFactNodeId: (id) => id.startsWith('fact') });
}

function makeTooltip(): FactTooltipApi {
  return {
    showFactTooltip: vi.fn(),
    hideFactTooltip: vi.fn(),
  };
}

function makeMenus(tooltip: FactTooltipApi): GraphMenus {
  return {
    node: ref(null),
    factNode: ref(null),
    edge: ref(null),
    view: ref(null),
    factTooltip: ref(tooltip),
  };
}

function nodeEvent(node: string): NodeEvent<PointerEvent> {
  return { node, event: new PointerEvent('pointerover') };
}

function clickEvent(node: string): NodeEvent<MouseEvent> {
  return { node, event: new MouseEvent('click') };
}

describe('useGraphInteractions — fact tooltip and details', () => {
  it('shows the tooltip when the pointer enters a fact node', () => {
    const tooltip = makeTooltip();
    const { eventHandlers } = useGraphInteractions(makeSelection(), makeMenus(tooltip));

    eventHandlers['node:pointerover']!(nodeEvent('fact-1'));

    expect(tooltip.showFactTooltip).toHaveBeenCalledTimes(1);
  });

  it('does not show the tooltip for character nodes', () => {
    const tooltip = makeTooltip();
    const { eventHandlers } = useGraphInteractions(makeSelection(), makeMenus(tooltip));

    eventHandlers['node:pointerover']!(nodeEvent('character-1'));

    expect(tooltip.showFactTooltip).not.toHaveBeenCalled();
  });

  it('hides the tooltip when the pointer leaves a fact node', () => {
    const tooltip = makeTooltip();
    const { eventHandlers } = useGraphInteractions(makeSelection(), makeMenus(tooltip));

    eventHandlers['node:pointerout']!(nodeEvent('fact-1'));

    expect(tooltip.hideFactTooltip).toHaveBeenCalledTimes(1);
  });

  it('single-clicking a fact node only selects it — no details window', () => {
    const tooltip = makeTooltip();
    const selection = makeSelection();
    const onFactNodeDoubleClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(tooltip), {
      onFactNodeDoubleClicked,
    });

    eventHandlers['node:click']!(clickEvent('fact-1'));

    expect(selection.selectedFactNodeId.value).toBe('fact-1');
    expect(onFactNodeDoubleClicked).not.toHaveBeenCalled();
  });

  it('double-clicking a fact node hides the tooltip and opens the details', () => {
    const tooltip = makeTooltip();
    const selection = makeSelection();
    const onFactNodeDoubleClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(tooltip), {
      onFactNodeDoubleClicked,
    });

    eventHandlers['node:dblclick']!(clickEvent('fact-1'));

    expect(selection.selectedFactNodeId.value).toBe('fact-1');
    expect(tooltip.hideFactTooltip).toHaveBeenCalledTimes(1);
    expect(onFactNodeDoubleClicked).toHaveBeenCalledWith('fact-1');
  });

  it('double-clicking a character node does not open the fact details', () => {
    const selection = makeSelection();
    const onFactNodeDoubleClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(makeTooltip()), {
      onFactNodeDoubleClicked,
    });

    eventHandlers['node:dblclick']!(clickEvent('character-1'));

    expect(onFactNodeDoubleClicked).not.toHaveBeenCalled();
  });

  function makeEdgeEvent(type: string): EdgeEvent<MouseEvent> {
    return {
      edge: 'char-1@char-2',
      edges: ['char-1@char-2'],
      summarized: false,
      event: new MouseEvent(type),
    } as EdgeEvent<MouseEvent>;
  }

  it('single-clicking an edge only selects it — no details window', () => {
    const selection = makeSelection();
    const onKnowEdgeDoubleClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(makeTooltip()), {
      onKnowEdgeDoubleClicked,
    });

    eventHandlers['edge:click']!(makeEdgeEvent('click'));

    expect(selection.selectedEdgeId.value).toBe('char-1@char-2');
    expect(onKnowEdgeDoubleClicked).not.toHaveBeenCalled();
  });

  it('double-clicking an edge selects it and asks for the relation details', () => {
    const selection = makeSelection();
    const onKnowEdgeDoubleClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(makeTooltip()), {
      onKnowEdgeDoubleClicked,
    });

    eventHandlers['edge:dblclick']!(makeEdgeEvent('dblclick'));

    expect(selection.selectedEdgeId.value).toBe('char-1@char-2');
    expect(onKnowEdgeDoubleClicked).toHaveBeenCalledWith('char-1@char-2');
  });
});

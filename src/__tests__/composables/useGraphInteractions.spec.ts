import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import type { NodeEvent } from 'v-network-graph';
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

  it('left-clicking a fact node selects it, hides the tooltip and opens the details', () => {
    const tooltip = makeTooltip();
    const selection = makeSelection();
    const onFactNodeClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(tooltip), {
      onFactNodeClicked,
    });

    eventHandlers['node:click']!(clickEvent('fact-1'));

    expect(selection.selectedFactNodeId.value).toBe('fact-1');
    expect(tooltip.hideFactTooltip).toHaveBeenCalledTimes(1);
    expect(onFactNodeClicked).toHaveBeenCalledWith('fact-1');
  });

  it('left-clicking a character node does not open the fact details', () => {
    const tooltip = makeTooltip();
    const selection = makeSelection();
    const onFactNodeClicked = vi.fn();
    const { eventHandlers } = useGraphInteractions(selection, makeMenus(tooltip), {
      onFactNodeClicked,
    });

    eventHandlers['node:click']!(clickEvent('character-1'));

    expect(selection.firstSelectedNodeId.value).toBe('character-1');
    expect(onFactNodeClicked).not.toHaveBeenCalled();
  });
});

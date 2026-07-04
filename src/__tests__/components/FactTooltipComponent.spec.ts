import { describe, it, expect } from 'vitest';
import { config, mount } from '@vue/test-utils';
import type * as vNG from 'v-network-graph';
import FactTooltipComponent from '@/components/FactTooltipComponent.vue';
import { Fact } from '@/services/Models/Fact';

// The tooltip teleports to <body> (via ContextMenuRoot); stub the teleport so
// the content renders inline and stays queryable via `wrapper` (same approach
// as the context-menu specs).
config.global.stubs = { teleport: true };

const facts = new Map<string, Fact>([
  ['fact-1', new Fact('fact-1', 'Secret heritage', 'Is the lost heir of the northern throne.')],
]);

function mountTooltip() {
  return mount(FactTooltipComponent, {
    props: { getFactById: (id: string) => facts.get(id) },
  });
}

function nodeEvent(node: string): vNG.NodeEvent<PointerEvent> {
  return {
    node,
    event: new PointerEvent('pointerover', { clientX: 100, clientY: 200 }),
  };
}

describe('FactTooltipComponent', () => {
  it('is hidden initially', () => {
    const wrapper = mountTooltip();

    expect(wrapper.find('#fact-tooltip').exists()).toBe(false);
  });

  it('shows the fact title and content on showFactTooltip', async () => {
    const wrapper = mountTooltip();

    wrapper.vm.showFactTooltip(nodeEvent('fact-1'));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#fact-tooltip-title').text()).toBe('Secret heritage');
    expect(wrapper.find('#fact-tooltip-content').text()).toBe(
      'Is the lost heir of the northern throne.',
    );
  });

  it('positions the tooltip next to the pointer', async () => {
    const wrapper = mountTooltip();

    wrapper.vm.showFactTooltip(nodeEvent('fact-1'));
    await wrapper.vm.$nextTick();

    const style = wrapper.find('#fact-tooltip').attributes('style')!;
    expect(style).toContain('left: 114px');
    expect(style).toContain('top: 214px');
  });

  it('stays hidden for an id without a fact', async () => {
    const wrapper = mountTooltip();

    wrapper.vm.showFactTooltip(nodeEvent('character-1'));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#fact-tooltip').exists()).toBe(false);
  });

  it('hides again on hideFactTooltip', async () => {
    const wrapper = mountTooltip();
    wrapper.vm.showFactTooltip(nodeEvent('fact-1'));
    await wrapper.vm.$nextTick();

    wrapper.vm.hideFactTooltip();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('#fact-tooltip').exists()).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import GraphLegendComponent from '@/components/GraphLegendComponent.vue';
import { GRAPH_PALETTE } from '@/composables/useGraphConfiguration';

describe('GraphLegendComponent', () => {
  it('is collapsed by default', () => {
    const wrapper = mount(GraphLegendComponent, {
      props: { isGameMaster: true, palette: GRAPH_PALETTE },
    });

    expect(wrapper.find('#graph-legend-panel').exists()).toBe(false);
    expect(wrapper.find('#graph-legend-toggle-button').text()).toBe('Legend');
  });

  it('the toggle button opens and closes the panel', async () => {
    const wrapper = mount(GraphLegendComponent, {
      props: { isGameMaster: true, palette: GRAPH_PALETTE },
    });

    await wrapper.find('#graph-legend-toggle-button').trigger('click');
    expect(wrapper.find('#graph-legend-panel').exists()).toBe(true);
    expect(wrapper.find('#graph-legend-toggle-button').text()).toBe('Hide legend');

    await wrapper.find('#graph-legend-toggle-button').trigger('click');
    expect(wrapper.find('#graph-legend-panel').exists()).toBe(false);
  });

  it('swatches use the shared graph palette', async () => {
    const wrapper = mount(GraphLegendComponent, {
      props: { isGameMaster: true, palette: GRAPH_PALETTE },
    });
    await wrapper.find('#graph-legend-toggle-button').trigger('click');

    const characterSwatch = wrapper.find('#graph-legend-character-node .legend-node');
    // jsdom normalises hex colours to rgb(); compare via the style object.
    expect((characterSwatch.element as HTMLElement).style.backgroundColor).toBe(
      hexToRgb(GRAPH_PALETTE.characterNode),
    );
  });

  it('the GM sees the hidden-items section', async () => {
    const wrapper = mount(GraphLegendComponent, {
      props: { isGameMaster: true, palette: GRAPH_PALETTE },
    });
    await wrapper.find('#graph-legend-toggle-button').trigger('click');

    expect(wrapper.find('#graph-legend-hidden-character').exists()).toBe(true);
    expect(wrapper.find('#graph-legend-hidden-fact').exists()).toBe(true);
    expect(wrapper.find('#graph-legend-hidden-edge').exists()).toBe(true);
    expect(wrapper.text()).toContain('Hidden from players');
  });

  it('players do not see the hidden-items section at all', async () => {
    const wrapper = mount(GraphLegendComponent, {
      props: { isGameMaster: false, palette: GRAPH_PALETTE },
    });
    await wrapper.find('#graph-legend-toggle-button').trigger('click');

    expect(wrapper.find('#graph-legend-hidden-character').exists()).toBe(false);
    expect(wrapper.find('#graph-legend-hidden-fact').exists()).toBe(false);
    expect(wrapper.find('#graph-legend-hidden-edge').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Hidden from players');
    // The regular sections are still there.
    expect(wrapper.find('#graph-legend-character-node').exists()).toBe(true);
    expect(wrapper.find('#graph-legend-strong-relation').exists()).toBe(true);
  });
});

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

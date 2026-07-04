import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import KnowEdgeDetailsComponent from '@/components/KnowEdgeDetailsComponent.vue';
import { KnowEdge } from '@/models/KnowEdge';

const longDescription =
  'They fought side by side in the goblin wars and have trusted each other with their lives ever since.';

function mountDetails(
  open: boolean,
  edge: KnowEdge | null = new KnowEdge('char-1', 'char-2', longDescription, true),
) {
  return mount(KnowEdgeDetailsComponent, {
    props: { open, edge, fromCharacterName: 'Frodo', toCharacterName: 'Sam' },
  });
}

describe('KnowEdgeDetailsComponent', () => {
  it('is hidden while open is false', () => {
    const wrapper = mountDetails(false);

    expect(wrapper.find('.modal').classes()).not.toContain('is-active');
  });

  it('titles the window with the character names and shows the full description', () => {
    const wrapper = mountDetails(true);

    expect(wrapper.find('.modal').classes()).toContain('is-active');
    expect(wrapper.find('#know-edge-details-title').text()).toBe('Frodo → Sam');
    expect(wrapper.find('#know-edge-details-description').text()).toBe(longDescription);
  });

  it('falls back to the character ids when names are missing', () => {
    const wrapper = mount(KnowEdgeDetailsComponent, {
      props: {
        open: true,
        edge: new KnowEdge('char-1', 'char-2', 'desc', true),
        fromCharacterName: null,
        toCharacterName: null,
      },
    });

    expect(wrapper.find('#know-edge-details-title').text()).toBe('char-1 → char-2');
  });

  it('labels a strong relation', () => {
    const wrapper = mountDetails(true);

    expect(wrapper.find('#know-edge-details-strength').text()).toBe('Strong relation');
  });

  it('labels a weak relation', () => {
    const wrapper = mountDetails(true, new KnowEdge('char-1', 'char-2', 'desc', false));

    expect(wrapper.find('#know-edge-details-strength').text()).toBe('Weak relation');
  });

  it('closes via the close button', async () => {
    const wrapper = mountDetails(true);

    await wrapper.find('#know-edge-details-close-button').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});

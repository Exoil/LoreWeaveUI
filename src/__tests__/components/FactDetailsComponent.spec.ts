import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FactDetailsComponent from '@/components/FactDetailsComponent.vue';
import { Fact } from '@/services/Models/Fact';

const fact = new Fact('fact-1', 'Secret heritage', 'Is the lost heir of the northern throne.');

function mountDetails(open: boolean, factProp: Fact | null = fact) {
  return mount(FactDetailsComponent, {
    props: { open, fact: factProp, 'onUpdate:open': undefined },
  });
}

describe('FactDetailsComponent', () => {
  it('is hidden while open is false', () => {
    const wrapper = mountDetails(false);

    expect(wrapper.find('.modal').classes()).not.toContain('is-active');
  });

  it('shows the fact title and content when open', () => {
    const wrapper = mountDetails(true);

    expect(wrapper.find('.modal').classes()).toContain('is-active');
    expect(wrapper.find('#fact-details-title').text()).toBe('Secret heritage');
    expect(wrapper.find('#fact-details-content').text()).toBe(
      'Is the lost heir of the northern throne.',
    );
  });

  it('renders empty text when no fact is given', () => {
    const wrapper = mountDetails(true, null);

    expect(wrapper.find('#fact-details-title').text()).toBe('');
    expect(wrapper.find('#fact-details-content').text()).toBe('');
  });

  it('closes via the close button', async () => {
    const wrapper = mountDetails(true);

    await wrapper.find('#fact-details-close-button').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('closes via a click on the background', async () => {
    const wrapper = mountDetails(true);

    await wrapper.find('.modal-background').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });
});

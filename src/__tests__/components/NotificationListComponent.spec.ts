import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NotificationListComponent from '@/components/NotificationListComponent.vue';
import { NotificationService } from '@/services/NotificationService';

function mountList(service: NotificationService) {
  return mount(NotificationListComponent, {
    props: { notificationService: service },
  });
}

describe('NotificationListComponent', () => {
  it('renders nothing while there are no notifications', () => {
    const wrapper = mountList(new NotificationService());

    expect(wrapper.findAll('.app-notification')).toHaveLength(0);
  });

  it('shows a toast when the service publishes an HTTP error', async () => {
    const service = new NotificationService();
    const wrapper = mountList(service);

    service.notifyHttpError(500);
    await wrapper.vm.$nextTick();

    const toasts = wrapper.findAll('.app-notification');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.text()).toContain('issue with the API/server');
    expect(toasts[0]!.classes()).toContain('is-danger');
  });

  it('shows one toast per published error', async () => {
    const service = new NotificationService();
    const wrapper = mountList(service);

    service.notifyHttpError(400);
    service.notifyHttpError(503);
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.app-notification')).toHaveLength(2);
  });

  it('removes a toast when its delete button is clicked', async () => {
    const service = new NotificationService();
    const wrapper = mountList(service);

    service.notifyHttpError(404);
    await wrapper.vm.$nextTick();

    await wrapper.find('.app-notification-dismiss').trigger('click');

    expect(wrapper.findAll('.app-notification')).toHaveLength(0);
  });

  it('stops listening once unmounted', async () => {
    const service = new NotificationService();
    const wrapper = mountList(service);

    wrapper.unmount();

    // Publishing after unmount must not throw.
    expect(() => service.notifyHttpError(500)).not.toThrow();
  });
});

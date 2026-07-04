import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNotifications } from '@/composables/useNotifications';
import { NotificationService } from '@/services/NotificationService';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with no notifications', () => {
    const { notifications } = useNotifications(new NotificationService());

    expect(notifications.value).toEqual([]);
  });

  it('collects notifications published on the service', () => {
    const service = new NotificationService();
    const { notifications } = useNotifications(service);

    service.notify('first');
    service.notify('second');

    expect(notifications.value.map((n) => n.message)).toEqual(['first', 'second']);
  });

  it('auto-dismisses a notification after the configured delay', () => {
    const service = new NotificationService();
    const { notifications } = useNotifications(service, { autoDismissMs: 1000 });

    service.notify('temporary');
    expect(notifications.value).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(notifications.value).toHaveLength(0);
  });

  it('keeps notifications forever when autoDismissMs is 0', () => {
    const service = new NotificationService();
    const { notifications } = useNotifications(service, { autoDismissMs: 0 });

    service.notify('sticky');
    vi.advanceTimersByTime(60_000);

    expect(notifications.value).toHaveLength(1);
  });

  it('dismiss removes only the targeted notification', () => {
    const service = new NotificationService();
    const { notifications, dismiss } = useNotifications(service, { autoDismissMs: 0 });

    service.notify('keep');
    service.notify('remove');
    const toRemove = notifications.value.find((n) => n.message === 'remove')!;

    dismiss(toRemove.id);

    expect(notifications.value.map((n) => n.message)).toEqual(['keep']);
  });

  it('clear removes every notification and cancels timers', () => {
    const service = new NotificationService();
    const { notifications, clear } = useNotifications(service, { autoDismissMs: 1000 });

    service.notify('one');
    service.notify('two');
    clear();

    expect(notifications.value).toHaveLength(0);
    // Advancing time must not dismiss anything twice / throw.
    vi.advanceTimersByTime(1000);
    expect(notifications.value).toHaveLength(0);
  });
});

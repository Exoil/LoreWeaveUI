import { computed, getCurrentScope, onScopeDispose, ref } from 'vue';
import type { AppNotification } from '@/models/AppNotification';
import type { NotificationService } from '@/services/NotificationService';

export interface UseNotificationsOptions {
  /** Auto-dismiss delay in ms; `0` keeps toasts until dismissed. Default 6000. */
  autoDismissMs?: number;
}

/**
 * Subscribes to a {@link NotificationService} and maintains the list of toasts
 * currently on screen. Each incoming notification is auto-dismissed after
 * `autoDismissMs` (unless 0). Unsubscribes and clears timers when the calling
 * effect scope (usually the hosting component) is disposed.
 */
export function useNotifications(
  notificationService: NotificationService,
  options: UseNotificationsOptions = {},
) {
  const autoDismissMs = options.autoDismissMs ?? 6000;

  const items = ref<AppNotification[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();

  /** Toasts currently on screen, oldest first (read-only). */
  const notifications = computed<AppNotification[]>(() => items.value);

  /** Remove one toast and cancel its auto-dismiss timer. */
  function dismiss(id: number): void {
    const timer = timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(id);
    }
    items.value = items.value.filter((n) => n.id !== id);
  }

  /** Remove every toast and cancel all timers. */
  function clear(): void {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    items.value = [];
  }

  function onNotification(notification: AppNotification): void {
    items.value = [...items.value, notification];
    if (autoDismissMs > 0) {
      timers.set(
        notification.id,
        setTimeout(() => dismiss(notification.id), autoDismissMs),
      );
    }
  }

  notificationService.onNotification(onNotification);

  // Guarded so the composable can also run outside a component (e.g. tests).
  if (getCurrentScope()) {
    onScopeDispose(() => {
      notificationService.offNotification(onNotification);
      clear();
    });
  }

  return { notifications, dismiss, clear };
}

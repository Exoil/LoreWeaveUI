<script setup lang="ts">
/**
 * Toast stack for app-wide notifications (top-right corner). Subscribes to the
 * injected {@link NotificationService} via `useNotifications`; toasts
 * auto-dismiss after a few seconds or on their delete button.
 */
import type { NotificationService } from '@/services/NotificationService';
import { useNotifications } from '@/composables/useNotifications';

const props = defineProps<{
  notificationService: NotificationService;
}>();

const { notifications, dismiss } = useNotifications(props.notificationService);
</script>

<template>
  <div id="app-notification-list" class="notification-stack">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="notification is-light app-notification"
      :class="`is-${notification.type}`"
    >
      <button
        class="delete app-notification-dismiss"
        type="button"
        @click="dismiss(notification.id)"
      ></button>
      {{ notification.message }}
    </div>
  </div>
</template>

<style scoped>
/* Bulma has no toast positioning; anchor the stack over the graph. */
.notification-stack {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 24rem;
}

.app-notification {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>

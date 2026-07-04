/** Bulma colour modifier used when rendering a notification toast. */
export type AppNotificationType = 'danger' | 'warning' | 'info' | 'success';

/**
 * UI model for one toast shown by `NotificationListComponent`. Created by
 * `NotificationService` and consumed by `useNotifications`.
 */
export class AppNotification {
  /** Monotonic id assigned by the service; used as list key and dismiss handle. */
  public id: number;
  /** Human-readable text shown inside the toast. */
  public message: string;
  /** Bulma colour of the toast (`is-${type}`). */
  public type: AppNotificationType;

  constructor(id: number, message: string, type: AppNotificationType = 'danger') {
    this.id = id;
    this.message = message;
    this.type = type;
  }
}

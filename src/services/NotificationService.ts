import mitt, { type Emitter } from 'mitt';
import { AppNotification, type AppNotificationType } from '@/models/AppNotification';

type NotificationEvents = {
  notification: AppNotification;
};

/** Handler signature accepted by {@link NotificationService.onNotification}. */
export type NotificationHandler = (notification: AppNotification) => void;

/**
 * App-wide notification hub built on a `mitt` event bus. Publishers (e.g. the
 * HTTP error interceptor in `LoreWeaveApiService`) call `notify*`; the
 * `useNotifications` composable subscribes and renders the toasts. Create one
 * instance in `App.vue` and share it via props, like `LoreWeaveApiService`.
 */
export class NotificationService {
  private _emitter: Emitter<NotificationEvents> = mitt<NotificationEvents>();
  private _nextId = 1;

  /** Publish a notification with the given message and Bulma colour. */
  public notify(message: string, type: AppNotificationType = 'danger'): void {
    this._emitter.emit('notification', new AppNotification(this._nextId++, message, type));
  }

  /**
   * Publish the user-facing message for a failed backend call.
   * @param status HTTP status code, or `undefined` when the request got no
   *               response at all (network failure / server unreachable).
   */
  public notifyHttpError(status: number | undefined): void {
    this.notify(NotificationService.httpErrorMessage(status), 'danger');
  }

  /** Map an HTTP error status to a user-facing message (5xx → server issue). */
  public static httpErrorMessage(status: number | undefined): string {
    if (status === undefined) {
      return 'Cannot reach the API/server. Check your connection and try again.';
    }
    if (status >= 500) {
      return `There is an issue with the API/server (HTTP ${status}). Please try again later.`;
    }
    switch (status) {
      case 404:
        return 'The requested item was not found (HTTP 404). It may have been deleted.';
      case 409:
        return 'The item was changed by someone else (HTTP 409). Reload and try again.';
      default:
        return `The request failed (HTTP ${status}). Please check your input and try again.`;
    }
  }

  /** Subscribe to published notifications. Pair with {@link offNotification}. */
  public onNotification(handler: NotificationHandler): void {
    this._emitter.on('notification', handler);
  }

  /** Remove a handler previously registered with {@link onNotification}. */
  public offNotification(handler: NotificationHandler): void {
    this._emitter.off('notification', handler);
  }
}

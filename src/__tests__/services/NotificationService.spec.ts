import { describe, it, expect, vi } from 'vitest';
import { NotificationService } from '@/services/NotificationService';
import { AppNotification } from '@/models/AppNotification';

describe('NotificationService', () => {
  it('delivers published notifications to subscribers', () => {
    const service = new NotificationService();
    const handler = vi.fn();
    service.onNotification(handler);

    service.notify('Something happened', 'warning');

    expect(handler).toHaveBeenCalledTimes(1);
    const notification = handler.mock.calls[0]![0] as AppNotification;
    expect(notification.message).toBe('Something happened');
    expect(notification.type).toBe('warning');
  });

  it('assigns increasing ids to notifications', () => {
    const service = new NotificationService();
    const handler = vi.fn();
    service.onNotification(handler);

    service.notify('first');
    service.notify('second');

    const first = handler.mock.calls[0]![0] as AppNotification;
    const second = handler.mock.calls[1]![0] as AppNotification;
    expect(second.id).toBeGreaterThan(first.id);
  });

  it('stops delivering after offNotification', () => {
    const service = new NotificationService();
    const handler = vi.fn();
    service.onNotification(handler);
    service.offNotification(handler);

    service.notify('ignored');

    expect(handler).not.toHaveBeenCalled();
  });

  it('notifyHttpError publishes a danger notification', () => {
    const service = new NotificationService();
    const handler = vi.fn();
    service.onNotification(handler);

    service.notifyHttpError(500);

    const notification = handler.mock.calls[0]![0] as AppNotification;
    expect(notification.type).toBe('danger');
    expect(notification.message).toBe(NotificationService.httpErrorMessage(500));
  });

  describe('httpErrorMessage', () => {
    it('describes 5xx as an API/server issue', () => {
      expect(NotificationService.httpErrorMessage(500)).toContain('issue with the API/server');
      expect(NotificationService.httpErrorMessage(503)).toContain('issue with the API/server');
    });

    it('includes the status code for 5xx', () => {
      expect(NotificationService.httpErrorMessage(500)).toContain('500');
    });

    it('describes 404 as not found', () => {
      expect(NotificationService.httpErrorMessage(404)).toContain('not found');
    });

    it('describes 409 as a concurrent change', () => {
      expect(NotificationService.httpErrorMessage(409)).toContain('changed by someone else');
    });

    it('falls back to a generic request-failed message for other 4xx', () => {
      expect(NotificationService.httpErrorMessage(400)).toContain('request failed (HTTP 400)');
      expect(NotificationService.httpErrorMessage(422)).toContain('request failed (HTTP 422)');
    });

    it('describes a missing response as the server being unreachable', () => {
      expect(NotificationService.httpErrorMessage(undefined)).toContain('Cannot reach');
    });
  });
});

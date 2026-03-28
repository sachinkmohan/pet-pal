import * as Notifications from 'expo-notifications';
import { showSessionNotification, cancelSessionNotification } from '../NotificationService';

jest.mock('expo-notifications');

const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockDismiss = Notifications.dismissNotificationAsync as jest.Mock;
const mockPermissions = Notifications.requestPermissionsAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions.mockResolvedValue({ status: 'granted' });
  mockSchedule.mockResolvedValue('notification-id-1');
  mockDismiss.mockResolvedValue(undefined);
});

describe('cancelSessionNotification', () => {
  test('dismisses the notification id returned by scheduleNotificationAsync', async () => {
    mockSchedule.mockResolvedValue('abc-123');
    await showSessionNotification('Pochi');
    await cancelSessionNotification();

    expect(mockDismiss).toHaveBeenCalledWith('abc-123');
  });

  test('is a no-op when no notification is active', async () => {
    await cancelSessionNotification();
    expect(mockDismiss).not.toHaveBeenCalled();
  });
});

describe('showSessionNotification', () => {
  test('cancels previous notification before scheduling a new one', async () => {
    mockSchedule.mockResolvedValueOnce('first-id').mockResolvedValueOnce('second-id');

    await showSessionNotification('Pochi');
    await showSessionNotification('Pochi');

    expect(mockDismiss).toHaveBeenCalledWith('first-id');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  test('does nothing if permission is denied', async () => {
    mockPermissions.mockResolvedValue({ status: 'denied' });
    await showSessionNotification('Pochi');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('schedules a notification with pet name in title', async () => {
    await showSessionNotification('Pochi');

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.title).toContain('Pochi');
  });

  test('notification is persistent: sticky, no auto-dismiss, immediate trigger', async () => {
    await showSessionNotification('Pochi');

    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.sticky).toBe(true);
    expect(request.content.autoDismiss).toBe(false);
    expect(request.trigger).toBeNull();
  });
});

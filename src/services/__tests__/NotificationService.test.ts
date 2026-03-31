import * as Notifications from 'expo-notifications';
import { showSessionNotification, cancelSessionNotification, formatEndTime } from '../NotificationService';

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

describe('formatEndTime', () => {
  test('formats end time as 12-hour with AM/PM', () => {
    const now = new Date('2026-01-01T14:00:00').getTime();
    expect(formatEndTime(1800, now)).toBe('2:30 PM');
  });
});

describe('showSessionNotification', () => {
  test('schedules only the sticky running notification', async () => {
    await showSessionNotification('Pochi', 1500);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  test('sticky notification has pet name in title', async () => {
    await showSessionNotification('Pochi', 1500);
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.title).toContain('Pochi');
  });

  test('sticky notification is persistent: sticky, no auto-dismiss, immediate trigger', async () => {
    await showSessionNotification('Pochi', 1500);
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.sticky).toBe(true);
    expect(request.content.autoDismiss).toBe(false);
    expect(request.trigger).toBeNull();
  });

  test('body contains session end time', async () => {
    await showSessionNotification('Pochi', 1500);
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.body).toMatch(/\d+:\d{2} (AM|PM)/);
  });

  test('body contains the duration in minutes', async () => {
    // 1500 seconds = 25 minutes
    await showSessionNotification('Pochi', 1500);
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.body).toContain('25 min');
  });

  test('does nothing if permission is denied', async () => {
    mockPermissions.mockResolvedValue({ status: 'denied' });
    await showSessionNotification('Pochi', 1500);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('cancels previous sticky before scheduling a new one', async () => {
    mockSchedule
      .mockResolvedValueOnce('first-id')
      .mockResolvedValueOnce('second-id');
    await showSessionNotification('Pochi', 1500);
    await showSessionNotification('Pochi', 1500);
    expect(mockDismiss).toHaveBeenCalledWith('first-id');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });
});

describe('cancelSessionNotification', () => {
  test('dismisses the sticky notification', async () => {
    mockSchedule.mockResolvedValue('sticky-id');
    await showSessionNotification('Pochi', 1500);
    await cancelSessionNotification();
    expect(mockDismiss).toHaveBeenCalledWith('sticky-id');
  });

  test('is a no-op when nothing is active', async () => {
    await cancelSessionNotification();
    expect(mockDismiss).not.toHaveBeenCalled();
  });
});


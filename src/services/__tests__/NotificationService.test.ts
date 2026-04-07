import * as Notifications from 'expo-notifications';
import { showSessionNotification, cancelSessionNotification, formatEndTime, formatCheckpointBody, formatPrePhaseBody } from '../NotificationService';

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
    await showSessionNotification('Pochi', 1500, '🐥');
    expect(mockSchedule).toHaveBeenCalledTimes(1);
  });

  test('title contains pet name and pet emoji', async () => {
    await showSessionNotification('Pochi', 1500, '🐥');
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.title).toContain('Pochi');
    expect(request.content.title).toContain('🐥');
  });

  test('sticky notification is persistent: sticky, no auto-dismiss, immediate trigger', async () => {
    await showSessionNotification('Pochi', 1500, '🐥');
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.sticky).toBe(true);
    expect(request.content.autoDismiss).toBe(false);
    expect(request.trigger).toBeNull();
  });

  test('body contains come back time', async () => {
    await showSessionNotification('Pochi', 1500, '🐥');
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.body).toMatch(/Come back at \d+:\d{2} (AM|PM)/);
  });

  test('body contains the duration in minutes', async () => {
    // 1500 seconds = 25 minutes
    await showSessionNotification('Pochi', 1500, '🐥');
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.body).toContain('25 min');
  });

  test('does nothing if permission is denied', async () => {
    mockPermissions.mockResolvedValue({ status: 'denied' });
    await showSessionNotification('Pochi', 1500, '🐥');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('cancels previous sticky before scheduling a new one', async () => {
    mockSchedule
      .mockResolvedValueOnce('first-id')
      .mockResolvedValueOnce('second-id');
    await showSessionNotification('Pochi', 1500, '🐥');
    await showSessionNotification('Pochi', 1500, '🐥');
    expect(mockDismiss).toHaveBeenCalledWith('first-id');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });
});

describe('notification data', () => {
  test('includes endsAt timestamp equal to now + durationSeconds * 1000', async () => {
    const now = new Date('2026-01-01T14:00:00').getTime();
    await showSessionNotification('Pochi', 1500, '🐥', now);
    const [request] = mockSchedule.mock.calls[0];
    expect(request.content.data.endsAt).toBe(now + 1500 * 1000);
  });
});

describe('formatCheckpointBody', () => {
  test('tracer bullet: 600s → "Your 10m session begins now."', () => {
    expect(formatCheckpointBody(600)).toBe('Your 10m session begins now.');
  });

  test('3600s → "Your 1h session begins now."', () => {
    expect(formatCheckpointBody(3600)).toBe('Your 1h session begins now.');
  });

  test('5400s → "Your 1h 30m session begins now."', () => {
    expect(formatCheckpointBody(5400)).toBe('Your 1h 30m session begins now.');
  });

  test('null → "You\'re in flow. Let\'s go."', () => {
    expect(formatCheckpointBody(null)).toBe("You're in flow. Let's go.");
  });
});

describe('cancelSessionNotification', () => {
  test('dismisses the sticky notification', async () => {
    mockSchedule.mockResolvedValue('sticky-id');
    await showSessionNotification('Pochi', 1500, '🐥');
    await cancelSessionNotification();
    expect(mockDismiss).toHaveBeenCalledWith('sticky-id');
  });

  test('is a no-op when nothing is active', async () => {
    await cancelSessionNotification();
    expect(mockDismiss).not.toHaveBeenCalled();
  });
});

describe('formatPrePhaseBody', () => {
  test('tracer bullet: with duration — contains begin time and end time', () => {
    const now = new Date('2026-01-01T14:00:00').getTime();
    const body = formatPrePhaseBody(1500, now);
    expect(body).toMatch(/Task begins at \d+:\d{2} (AM|PM)/);
    expect(body).toMatch(/Ends at \d+:\d{2} (AM|PM)/);
  });

  test('null duration — contains begin time but not "Ends at"', () => {
    const now = new Date('2026-01-01T14:00:00').getTime();
    const body = formatPrePhaseBody(null, now);
    expect(body).toMatch(/Task begins at \d+:\d{2} (AM|PM)/);
    expect(body).not.toContain('Ends at');
  });

  test('begin time is 2 minutes after now', () => {
    const now = new Date('2026-01-01T14:00:00').getTime();
    const body = formatPrePhaseBody(1500, now);
    expect(body).toContain('2:02 PM');
  });

  test('end time is warm-up + session duration after now', () => {
    // 14:00 + 2min warm-up + 25min session = 14:27
    const now = new Date('2026-01-01T14:00:00').getTime();
    const body = formatPrePhaseBody(1500, now);
    expect(body).toContain('2:27 PM');
  });
});


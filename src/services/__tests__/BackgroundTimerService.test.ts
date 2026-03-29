jest.mock('react-native-background-actions', () => ({
  __esModule: true,
  default: {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    updateNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

import BackgroundService from 'react-native-background-actions';
import { formatTime, startBackgroundTimer, stopBackgroundTimer } from '../BackgroundTimerService';

const mockStart = BackgroundService.start as jest.Mock;
const mockStop = BackgroundService.stop as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('formatTime', () => {
  test('converts 90 seconds to 01:30', () => {
    expect(formatTime(90)).toBe('01:30');
  });

  test('converts 0 seconds to 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  test('converts 59 seconds to 00:59', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  test('converts 3600 seconds to 60:00 (max session)', () => {
    expect(formatTime(3600)).toBe('60:00');
  });
});

describe('startBackgroundTimer', () => {
  test('starts background service with pet name in taskTitle', async () => {
    await startBackgroundTimer('Pochi', 1500, jest.fn());

    const [, options] = mockStart.mock.calls[0];
    expect(options.taskTitle).toContain('Pochi');
  });

  test('starts background service with formatted duration in taskDesc', async () => {
    await startBackgroundTimer('Pochi', 1500, jest.fn()); // 1500s = 25:00

    const [, options] = mockStart.mock.calls[0];
    expect(options.taskDesc).toBe('25:00 remaining');
  });
});

describe('stopBackgroundTimer', () => {
  test('stops the background service when running', async () => {
    await startBackgroundTimer('Pochi', 1500, jest.fn());
    await stopBackgroundTimer();

    expect(mockStop).toHaveBeenCalledTimes(1);
  });

  test('is a no-op when not running', async () => {
    await stopBackgroundTimer();
    expect(mockStop).not.toHaveBeenCalled();
  });
});

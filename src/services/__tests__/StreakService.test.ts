jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { calculateStreak, StreakInput } from '../StreakService';

const TODAY = '2026-03-31';
const YESTERDAY = '2026-03-30';
const TWO_DAYS_AGO = '2026-03-29';

// 12:00 PM on TODAY
const NOW = new Date('2026-03-31T12:00:00Z').getTime();
// Fed 1 hour ago — within 24h
const FED_TODAY = NOW - 60 * 60 * 1000;
// Fed 25 hours ago — outside 24h window
const FED_OLD = NOW - 25 * 60 * 60 * 1000;

function base(): StreakInput {
  return {
    sessionsToday: 1,
    lastFedTime: FED_TODAY,
    lastStreakDate: null,
    currentStreak: 0,
    longestStreak: 0,
    now: NOW,
  };
}

describe('calculateStreak', () => {
  test('session + fed today with no prior streak → streak becomes 1', () => {
    const result = calculateStreak(base());
    expect(result.qualifies).toBe(true);
    expect(result.streak).toBe(1);
    expect(result.lastStreakDate).toBe(TODAY);
  });

  test('session done but not fed → does not qualify, streak stays 0', () => {
    const result = calculateStreak({ ...base(), lastFedTime: null });
    expect(result.qualifies).toBe(false);
    expect(result.streak).toBe(0);
  });

  test('fed but no sessions → does not qualify', () => {
    const result = calculateStreak({ ...base(), sessionsToday: 0 });
    expect(result.qualifies).toBe(false);
    expect(result.streak).toBe(0);
  });

  test('qualifying day after consecutive qualifying yesterday → streak extends', () => {
    const result = calculateStreak({
      ...base(),
      lastStreakDate: YESTERDAY,
      currentStreak: 3,
      longestStreak: 3,
    });
    expect(result.qualifies).toBe(true);
    expect(result.streak).toBe(4);
    expect(result.lastStreakDate).toBe(TODAY);
  });

  test('day gap (last streak was 2 days ago) → new streak starts at 1', () => {
    const result = calculateStreak({
      ...base(),
      lastStreakDate: TWO_DAYS_AGO,
      currentStreak: 5,
      longestStreak: 5,
    });
    expect(result.qualifies).toBe(true);
    expect(result.streak).toBe(1);
  });

  test('already credited today → idempotent, streak unchanged', () => {
    const result = calculateStreak({
      ...base(),
      lastStreakDate: TODAY,
      currentStreak: 4,
      longestStreak: 4,
    });
    expect(result.qualifies).toBe(true);
    expect(result.streak).toBe(4);
    expect(result.lastStreakDate).toBe(TODAY);
  });

  test('longest streak updates when current exceeds it', () => {
    const result = calculateStreak({
      ...base(),
      lastStreakDate: YESTERDAY,
      currentStreak: 7,
      longestStreak: 7,
    });
    expect(result.longestStreak).toBe(8);
  });

  test('fed time older than 24h does not count as fed today', () => {
    const result = calculateStreak({ ...base(), lastFedTime: FED_OLD });
    expect(result.qualifies).toBe(false);
    expect(result.streak).toBe(0);
  });
});

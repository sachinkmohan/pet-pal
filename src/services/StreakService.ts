import { getItem, setItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

export interface StreakInput {
  sessionsToday: number;
  lastFedTime: number | null;
  lastStreakDate: string | null;
  currentStreak: number;
  longestStreak: number;
  now: number;
}

export interface StreakResult {
  qualifies: boolean;
  streak: number;
  longestStreak: number;
  lastStreakDate: string | null;
}

function toDateStr(ms: number): string {
  return new Date(ms).toISOString().split('T')[0];
}

function isFedWithin24h(lastFedTime: number | null, now: number): boolean {
  if (lastFedTime === null) return false;
  return now - lastFedTime < 24 * 60 * 60 * 1000;
}

export function calculateStreak(input: StreakInput): StreakResult {
  const { sessionsToday, lastFedTime, lastStreakDate, currentStreak, longestStreak, now } = input;

  const qualifies = sessionsToday >= 1 && isFedWithin24h(lastFedTime, now);

  if (!qualifies) {
    return { qualifies: false, streak: 0, longestStreak, lastStreakDate };
  }

  const todayStr = toDateStr(now);
  const yesterdayMs = now - 24 * 60 * 60 * 1000;
  const yesterdayStr = toDateStr(yesterdayMs);

  // Already credited today — idempotent
  if (lastStreakDate === todayStr) {
    return { qualifies: true, streak: currentStreak, longestStreak, lastStreakDate: todayStr };
  }

  let newStreak: number;
  if (lastStreakDate === yesterdayStr) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, longestStreak);
  return { qualifies: true, streak: newStreak, longestStreak: newLongest, lastStreakDate: todayStr };
}

// Storage wiring — call after writing session data
export async function updateStreakAfterSession(): Promise<void> {
  const [sessionsToday, lastFedTime, lastStreakDate, currentStreak, longestStreak] =
    await Promise.all([
      getItem<number>(STORAGE_KEYS.SESSIONS_TODAY),
      getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
      getItem<string>(STORAGE_KEYS.LAST_STREAK_DATE),
      getItem<number>(STORAGE_KEYS.CURRENT_STREAK),
      getItem<number>(STORAGE_KEYS.LONGEST_STREAK),
    ]);

  const result = calculateStreak({
    sessionsToday: sessionsToday ?? 0,
    lastFedTime: lastFedTime ?? null,
    lastStreakDate: lastStreakDate ?? null,
    currentStreak: currentStreak ?? 0,
    longestStreak: longestStreak ?? 0,
    now: Date.now(),
  });

  await Promise.all([
    setItem(STORAGE_KEYS.CURRENT_STREAK, result.streak),
    setItem(STORAGE_KEYS.LAST_STREAK_DATE, result.lastStreakDate ?? ''),
    setItem(STORAGE_KEYS.LONGEST_STREAK, result.longestStreak),
  ]);
}

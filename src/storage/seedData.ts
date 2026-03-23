import { getItem, setItem } from './AppStorage';
import { STORAGE_KEYS } from './keys';

// Default values for a brand-new install
const DEFAULTS = {
  [STORAGE_KEYS.ONBOARDING_COMPLETE]: false,
  [STORAGE_KEYS.PET_NAME]: 'Pochi',
  [STORAGE_KEYS.USAGE_STATS_ENABLED]: false,
  [STORAGE_KEYS.TOTAL_SESSIONS_EVER]: 0,
  [STORAGE_KEYS.EVOLUTION_STAGE]: 'egg',
  [STORAGE_KEYS.SESSIONS_TODAY]: 0,
  [STORAGE_KEYS.FOCUS_TIME_TODAY]: 0,
  [STORAGE_KEYS.LAST_DAILY_RESET]: null,
  [STORAGE_KEYS.LAST_FED_TIME]: null,
  [STORAGE_KEYS.TOTAL_FEEDS]: 0,
  [STORAGE_KEYS.CURRENT_STREAK]: 0,
  [STORAGE_KEYS.LAST_STREAK_DATE]: null,
  [STORAGE_KEYS.LONGEST_STREAK]: 0,
  [STORAGE_KEYS.PERSONAL_BEST]: 0,
  [STORAGE_KEYS.WEEKLY_FOCUS_DATA]: [0, 0, 0, 0, 0, 0, 0],
} as const;

// Run once on first launch — only writes keys that don't exist yet
export async function initializeDefaultsIfNeeded(): Promise<void> {
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    const existing = await getItem(key);
    if (existing === null && defaultValue !== null) {
      await setItem(key, defaultValue);
    }
  }
}

// Called at midnight or on app open after a new day starts
export async function resetDailyDataIfNeeded(): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastReset = await getItem<string>(STORAGE_KEYS.LAST_DAILY_RESET);

  if (lastReset === todayStr) return; // already reset today

  // Shift weekly data: drop oldest day, add today's (will be 0 initially)
  const weekly = await getItem<number[]>(STORAGE_KEYS.WEEKLY_FOCUS_DATA);
  const prevFocusTime = await getItem<number>(STORAGE_KEYS.FOCUS_TIME_TODAY);
  const updatedWeekly = [
    ...((weekly ?? [0, 0, 0, 0, 0, 0, 0]).slice(1)),
    prevFocusTime ?? 0,
  ];

  // Update personal best before resetting
  const personalBest = await getItem<number>(STORAGE_KEYS.PERSONAL_BEST);
  if ((prevFocusTime ?? 0) > (personalBest ?? 0)) {
    await setItem(STORAGE_KEYS.PERSONAL_BEST, prevFocusTime ?? 0);
  }

  // Check streak: was yesterday a qualifying day?
  await checkAndUpdateStreak();

  await setItem(STORAGE_KEYS.SESSIONS_TODAY, 0);
  await setItem(STORAGE_KEYS.FOCUS_TIME_TODAY, 0);
  await setItem(STORAGE_KEYS.WEEKLY_FOCUS_DATA, updatedWeekly);
  await setItem(STORAGE_KEYS.LAST_DAILY_RESET, todayStr);
}

async function checkAndUpdateStreak(): Promise<void> {
  const sessionsToday = await getItem<number>(STORAGE_KEYS.SESSIONS_TODAY);
  const lastFedTime = await getItem<number>(STORAGE_KEYS.LAST_FED_TIME);
  const isFedToday = lastFedTime !== null && isFedWithinDay(lastFedTime);

  const qualifies = (sessionsToday ?? 0) >= 1 && isFedToday;

  if (!qualifies) {
    // Missed a day — reset streak
    await setItem(STORAGE_KEYS.CURRENT_STREAK, 0);
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const lastStreakDate = await getItem<string>(STORAGE_KEYS.LAST_STREAK_DATE);
  const yesterday = getYesterdayStr();

  let streak = await getItem<number>(STORAGE_KEYS.CURRENT_STREAK) ?? 0;
  if (lastStreakDate === yesterday) {
    streak += 1;
  } else if (lastStreakDate !== todayStr) {
    streak = 1;
  }

  const longest = await getItem<number>(STORAGE_KEYS.LONGEST_STREAK) ?? 0;
  await setItem(STORAGE_KEYS.CURRENT_STREAK, streak);
  await setItem(STORAGE_KEYS.LAST_STREAK_DATE, todayStr);
  if (streak > longest) {
    await setItem(STORAGE_KEYS.LONGEST_STREAK, streak);
  }
}

function isFedWithinDay(lastFedTime: number): boolean {
  const now = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;
  return now - lastFedTime < msInDay;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

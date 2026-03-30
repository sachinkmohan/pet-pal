// All AsyncStorage keys used in the app — defined once to avoid typos

export const STORAGE_KEYS = {
  // Onboarding
  ONBOARDING_COMPLETE: 'onboardingComplete',
  PET_NAME: 'petName',
  USAGE_STATS_ENABLED: 'usageStatsEnabled',

  // Pet state
  TOTAL_SESSIONS_EVER: 'totalSessionsEver',
  EVOLUTION_STAGE: 'evolutionStage',

  // Daily data (reset at midnight)
  SESSIONS_TODAY: 'sessionsToday',
  FOCUS_TIME_TODAY: 'focusTimeToday', // minutes
  LAST_DAILY_RESET: 'lastDailyReset', // ISO date string

  // Feed mechanic
  LAST_FED_TIME: 'lastFedTime', // timestamp (ms)
  TOTAL_FEEDS: 'totalFeeds',

  // Streak
  CURRENT_STREAK: 'currentStreak',
  LAST_STREAK_DATE: 'lastStreakDate', // ISO date string
  LONGEST_STREAK: 'longestStreak',

  // Stats
  PERSONAL_BEST: 'personalBest', // best ever daily focus minutes
  WEEKLY_FOCUS_DATA: 'weeklyFocusData', // JSON array of last 7 days (minutes)

  // Focus screen
  RECENT_DURATIONS: 'recentDurations', // number[] of last 3 unique saved session durations (minutes)
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

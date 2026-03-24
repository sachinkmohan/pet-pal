import { MoodState } from '@/src/constants/PetStates';

// 20 hours — intentional habit-formation design (not 24)
export const FEED_COOLDOWN_MS = 20 * 60 * 60 * 1000;

export interface MoodInput {
  sessionsCompleted: number;
  lastFedTime: number | null;   // ms timestamp; null if never fed
  screenTimeEnabled: boolean;
  screenTimeHours?: number;     // only meaningful if screenTimeEnabled; defaults to 0
}

function isFedRecently(lastFedTime: number | null): boolean {
  if (lastFedTime === null) return false;
  return Date.now() - lastFedTime < FEED_COOLDOWN_MS;
}

function daysSinceLastFed(lastFedTime: number | null): number {
  if (lastFedTime === null) return Infinity; // never fed → treat as longest possible absence
  return (Date.now() - lastFedTime) / (24 * 60 * 60 * 1000);
}

/**
 * Calculates Pochi's current mood in real-time.
 * Called after every session completion and every feed.
 *
 * Priority order (first match wins):
 *   thriving → happy → okay → sick → tired
 */
export function calculateMood(input: MoodInput): MoodState {
  const {
    sessionsCompleted,
    lastFedTime,
    screenTimeEnabled,
    screenTimeHours = 0,
  } = input;

  const isFed = isFedRecently(lastFedTime);
  // Screen time only penalises thriving if the permission is enabled
  const screenTimeOk = !screenTimeEnabled || screenTimeHours < 3;

  if (sessionsCompleted >= 2 && isFed && screenTimeOk) return 'thriving';
  if (sessionsCompleted >= 1 && isFed) return 'happy';
  if (isFed || sessionsCompleted >= 1) return 'okay';
  // Sick: neglected for 2+ days with no sessions at all
  // Guard: null means never fed (new user), not neglect — start them at tired, not sick
  if (lastFedTime !== null && daysSinceLastFed(lastFedTime) >= 2 && sessionsCompleted === 0) return 'sick';
  return 'tired';
}

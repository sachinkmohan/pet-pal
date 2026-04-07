export type Task = {
  id: string;
  text: string;
  displayName: string;
  durationSeconds: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};

// Matches duration at the END of a string: e.g. "2h 30m", "1h", "45m", "1h30m"
const DURATION_PATTERN = /\s+(\d+h)?\s*(\d+m)?\s*$/i;
// More precise: requires at least one of h or m to be present and non-zero
const DURATION_END = /\s+((?:\d+h)?\s*(?:\d+m)?)$/i;

export function parseDuration(text: string): number | null {
  // Match duration at end of string, preceded by start-of-string or whitespace
  // Supports: 1h, 45m, 2h 30m, 1h30m
  const match = text.match(/(?:^|\s)((\d+)h)?\s*((\d+)m)?$/i);
  if (!match) return null;

  const hours = match[2] ? parseInt(match[2], 10) : 0;
  const minutes = match[4] ? parseInt(match[4], 10) : 0;

  // Must have at least one component and total > 0
  if (!match[1] && !match[3]) return null;
  const totalSeconds = (hours * 60 + minutes) * 60;
  return totalSeconds > 0 ? totalSeconds : null;
}

export function stripDuration(text: string): string {
  const trimmed = text.trim();
  // Remove the duration token from end
  const stripped = trimmed.replace(/\s+((?:\d+h)?\s*(?:\d+m)?)$/i, '').trim();
  // Only strip if there was actually a duration (parseDuration returns non-null)
  if (parseDuration(trimmed) !== null) {
    return stripped;
  }
  return trimmed;
}

export function createTask(text: string): Task {
  const trimmed = text.trim();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  return {
    id,
    text: trimmed,
    displayName: stripDuration(trimmed),
    durationSeconds: parseDuration(trimmed),
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function shouldCarryOver(lastDateISO: string | null, nowISO: string): boolean {
  if (!lastDateISO) return false;
  const lastDate = new Date(lastDateISO);
  const now = new Date(nowISO);
  // Compare calendar dates only (midnight boundary)
  const lastDay = `${lastDate.getFullYear()}-${lastDate.getMonth()}-${lastDate.getDate()}`;
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  return lastDay !== today;
}

export function filterForNewDay(tasks: Task[]): { completed: Task[]; incomplete: Task[] } {
  const completed = tasks.filter((t) => t.completed);
  const incomplete = tasks.filter((t) => !t.completed);
  return { completed, incomplete };
}

export function processTaskInput(
  newText: string,
  existingDuration: number | null,
): { displayText: string; durationSeconds: number | null } {
  const dur = parseDuration(newText);
  if (dur !== null) {
    return { displayText: stripDuration(newText), durationSeconds: dur };
  }
  if (newText === '') {
    return { displayText: '', durationSeconds: null };
  }
  return { displayText: newText, durationSeconds: existingDuration };
}

/**
 * Returns the coin reward for completing a task.
 * Formula: max(5, round(durationSeconds / 300))
 * Minimum of 5 coins regardless of duration. Null duration (no timer) also returns 5.
 */
export function calculateTaskCoins(durationSeconds: number | null): number {
  if (durationSeconds === null) return 5;
  return Math.max(5, Math.round(durationSeconds / 300));
}

/**
 * Adjusts the session duration to account for time already elapsed while
 * the pre-phase countdown was overdue (user did not start on time).
 * Returns durationSeconds minus overdueMs converted to seconds, floored at 5s.
 */
export function adjustSessionDuration(durationSeconds: number, overdueMs: number): number {
  const adjusted = durationSeconds - Math.round(overdueMs / 1000);
  return Math.max(5, adjusted);
}

export function buildRolling7Days(
  completions: { completedAt: string }[],
  now: Date,
): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0];

  // Normalise now to start of today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const { completedAt } of completions) {
    const completedDate = new Date(completedAt);
    const completedStart = new Date(completedDate);
    completedStart.setHours(0, 0, 0, 0);

    const diffMs = todayStart.getTime() - completedStart.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 6) {
      buckets[6 - diffDays] += 1;
    }
  }

  return buckets;
}

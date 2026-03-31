const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Builds the 7-bar dataset for the weekly chart.
 * weeklyData: up to 7 completed days (oldest first) from STORAGE_KEYS.WEEKLY_FOCUS_DATA.
 * focusTimeToday: today's accumulated minutes from STORAGE_KEYS.FOCUS_TIME_TODAY.
 * Returns exactly 7 values: [6 days ago, ..., yesterday, today].
 */
export function buildWeekBars(weeklyData: number[], focusTimeToday: number): number[] {
  const padded = Array(7).fill(0);
  const src = weeklyData.slice(-7); // at most 7 entries
  // Place stored days into the last positions, leaving today's slot (index 6) for focusTimeToday
  const storedCount = Math.min(src.length, 6);
  const stored6 = src.slice(-6); // last 6 of stored (= days [6-ago .. yesterday])
  for (let i = 0; i < stored6.length; i++) {
    padded[6 - stored6.length + i] = stored6[i];
  }
  padded[6] = focusTimeToday;
  return padded;
}

/**
 * Returns 7 day labels ending with 'Today', going backwards from yesterday.
 * e.g. if today is Tuesday: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Today']
 */
export function buildDayLabels(now: Date): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    if (i === 0) {
      labels.push('Today');
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(DAY_NAMES[d.getDay()]);
    }
  }
  return labels;
}

/**
 * Returns the index of the tallest bar. Returns -1 if all bars are zero.
 * When tied, returns the last (most recent) peak.
 */
export function findPeakIndex(bars: number[]): number {
  const max = Math.max(...bars);
  if (max === 0) return -1;
  // Find last occurrence of max
  for (let i = bars.length - 1; i >= 0; i--) {
    if (bars[i] === max) return i;
  }
  return -1;
}

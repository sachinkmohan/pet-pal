import { buildWeekBars, buildDayLabels, findPeakIndex } from '../StatsService';

const WEEK = [10, 20, 30, 40, 50, 60, 70]; // 7 stored days, oldest first

describe('buildWeekBars', () => {
  test('returns 7 bars: last 6 from weeklyData + focusTimeToday', () => {
    const bars = buildWeekBars(WEEK, 80);
    expect(bars).toHaveLength(7);
    expect(bars).toEqual([20, 30, 40, 50, 60, 70, 80]);
  });

  test('today (index 6) reflects focusTimeToday', () => {
    const bars = buildWeekBars(WEEK, 45);
    expect(bars[6]).toBe(45);
  });

  test('pads with zeros when weeklyData has fewer than 7 entries', () => {
    const bars = buildWeekBars([5, 10], 15);
    expect(bars).toHaveLength(7);
    expect(bars).toEqual([0, 0, 0, 0, 5, 10, 15]);
  });

  test('all zeros when no data at all', () => {
    const bars = buildWeekBars([], 0);
    expect(bars).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('buildDayLabels', () => {
  test('returns 7 labels ending with Today', () => {
    const labels = buildDayLabels(new Date('2026-03-31T12:00:00Z')); // Tuesday
    expect(labels).toHaveLength(7);
    expect(labels[6]).toBe('Today');
  });

  test('labels go backwards day by day from yesterday', () => {
    // 2026-03-31 is a Tuesday — yesterday (index 5) should be Mon
    const labels = buildDayLabels(new Date('2026-03-31T12:00:00Z'));
    expect(labels[5]).toBe('Mon');
    expect(labels[4]).toBe('Sun');
  });
});

describe('findPeakIndex', () => {
  test('returns index of the maximum bar', () => {
    expect(findPeakIndex([10, 50, 30, 80, 20, 60, 40])).toBe(3);
  });

  test('returns -1 when all bars are zero (no data to highlight)', () => {
    expect(findPeakIndex([0, 0, 0, 0, 0, 0, 0])).toBe(-1);
  });

  test('returns last index when multiple bars share the max', () => {
    expect(findPeakIndex([80, 0, 0, 0, 0, 0, 80])).toBe(6);
  });
});

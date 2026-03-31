import { minutesToHHMM, HHMMToMinutes, clampDuration } from '../durationPicker';

const MAX = 355; // 5h 55m
const MIN = 1;

describe('minutesToHHMM', () => {
  test('90 min → 1h 30m', () => {
    expect(minutesToHHMM(90)).toEqual({ hours: 1, mins: 30 });
  });

  test('0 min → 0h 0m', () => {
    expect(minutesToHHMM(0)).toEqual({ hours: 0, mins: 0 });
  });

  test('25 min → 0h 25m', () => {
    expect(minutesToHHMM(25)).toEqual({ hours: 0, mins: 25 });
  });

  test('355 min (max) → 5h 55m', () => {
    expect(minutesToHHMM(355)).toEqual({ hours: 5, mins: 55 });
  });

  test('60 min → 1h 0m', () => {
    expect(minutesToHHMM(60)).toEqual({ hours: 1, mins: 0 });
  });
});

describe('HHMMToMinutes', () => {
  test('1h 30m → 90 min', () => {
    expect(HHMMToMinutes(1, 30)).toBe(90);
  });

  test('0h 0m → 0 min', () => {
    expect(HHMMToMinutes(0, 0)).toBe(0);
  });

  test('5h 55m → 355 min', () => {
    expect(HHMMToMinutes(5, 55)).toBe(355);
  });

  test('0h 25m → 25 min', () => {
    expect(HHMMToMinutes(0, 25)).toBe(25);
  });
});

describe('clampDuration', () => {
  test('clamps above max to MAX (355)', () => {
    expect(clampDuration(400)).toBe(MAX);
  });

  test('clamps below min to MIN (1)', () => {
    expect(clampDuration(0)).toBe(MIN);
  });

  test('value within range is unchanged', () => {
    expect(clampDuration(90)).toBe(90);
  });

  test('exact max passes through', () => {
    expect(clampDuration(MAX)).toBe(MAX);
  });

  test('exact min passes through', () => {
    expect(clampDuration(MIN)).toBe(MIN);
  });
});

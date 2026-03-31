export const DURATION_MIN = 1;
export const DURATION_MAX = 355; // 5h 55m

export function minutesToHHMM(totalMinutes: number): { hours: number; mins: number } {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return { hours, mins };
}

export function HHMMToMinutes(hours: number, mins: number): number {
  return hours * 60 + mins;
}

export function clampDuration(minutes: number): number {
  return Math.min(Math.max(minutes, DURATION_MIN), DURATION_MAX);
}

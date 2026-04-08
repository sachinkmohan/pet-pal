export const DURATION_MIN = 1;
export const DURATION_MAX = 355; // 5h 55m

export function minutesToHHMM(totalMinutes: number): { hours: number; mins: number } {
  const total = Math.round(totalMinutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return { hours, mins };
}

export function HHMMToMinutes(hours: number, mins: number): number {
  return hours * 60 + mins;
}

export function formatDuration(totalMinutes: number): string {
  const { hours, mins } = minutesToHHMM(totalMinutes);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function clampDuration(minutes: number): number {
  return Math.min(Math.max(minutes, DURATION_MIN), DURATION_MAX);
}

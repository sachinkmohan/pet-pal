export function addRecentDuration(existing: number[], duration: number): number[] {
  return [duration, ...existing.filter((d) => d !== duration)].slice(0, 3);
}

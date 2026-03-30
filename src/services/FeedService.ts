const STAGE_THRESHOLDS = [0, 3, 10, 21, 50, 100];

const STAGE_SIZES = [36, 52, 68, 84, 100, 120];

export const FEED_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 hours

export function feedsToNextStage(totalFeeds: number): number | null {
  const nextThreshold = STAGE_THRESHOLDS.find((t) => t > totalFeeds);
  if (nextThreshold === undefined) return null;
  return nextThreshold - totalFeeds;
}

export function feedProgressPercent(totalFeeds: number): number {
  const currentThresholdIndex = STAGE_THRESHOLDS.findLastIndex((t) => t <= totalFeeds);
  const nextThreshold = STAGE_THRESHOLDS[currentThresholdIndex + 1];
  if (nextThreshold === undefined) return 100;
  const bandStart = STAGE_THRESHOLDS[currentThresholdIndex];
  const bandSize = nextThreshold - bandStart;
  return Math.floor(((totalFeeds - bandStart) / bandSize) * 100);
}

export function getFeedPetStage(totalFeeds: number): number {
  let stage = 1;
  for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
    if (totalFeeds >= STAGE_THRESHOLDS[i]) stage = i + 1;
  }
  return stage;
}

export function getFeedPetSize(stage: number): number {
  return STAGE_SIZES[stage - 1] ?? STAGE_SIZES[0];
}

export function canFeed(lastFedTime: number | null, now = Date.now()): boolean {
  if (lastFedTime === null) return true;
  return now - lastFedTime >= FEED_COOLDOWN_MS;
}

export function timeUntilNextFeed(lastFedTime: number, now = Date.now()): string {
  const msLeft = FEED_COOLDOWN_MS - (now - lastFedTime);
  const totalMins = Math.ceil(msLeft / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

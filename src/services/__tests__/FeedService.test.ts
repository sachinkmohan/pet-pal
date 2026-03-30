import { getFeedPetStage, getFeedPetSize, canFeed, timeUntilNextFeed, feedsToNextStage, feedProgressPercent } from '@/src/services/FeedService';
import { FEED_COOLDOWN_MS } from '@/src/services/MoodService';

describe('feedsToNextStage', () => {
  test('returns feeds needed from the start of stage 1', () => {
    expect(feedsToNextStage(0)).toBe(3);
  });

  test('returns remaining feeds mid-stage', () => {
    expect(feedsToNextStage(1)).toBe(2);  // 1 done, need 2 more to reach 3
    expect(feedsToNextStage(3)).toBe(7);  // just hit stage 2, need 7 to reach 10
    expect(feedsToNextStage(7)).toBe(3);  // 7 done, need 3 more to reach 10
  });

  test('returns null at max stage', () => {
    expect(feedsToNextStage(100)).toBeNull();
    expect(feedsToNextStage(999)).toBeNull();
  });
});

describe('feedProgressPercent', () => {
  test('returns 0 at the start of stage 1', () => {
    expect(feedProgressPercent(0)).toBe(0);
  });

  test('returns correct percent mid-stage', () => {
    expect(feedProgressPercent(1)).toBe(33);  // 1/3 through stage 1 band
    expect(feedProgressPercent(3)).toBe(0);   // start of stage 2 band (3→10)
    expect(feedProgressPercent(6)).toBe(42);  // 3/7 through stage 2 band
  });

  test('returns 100 at max stage', () => {
    expect(feedProgressPercent(100)).toBe(100);
    expect(feedProgressPercent(200)).toBe(100);
  });
});

describe('timeUntilNextFeed', () => {
  const NOW = 1_000_000_000_000;
  const HOUR = 60 * 60 * 1000;

  test('formats hours and minutes remaining', () => {
    expect(timeUntilNextFeed(NOW - 16 * HOUR, NOW)).toBe('4h');
  });

  test('shows only minutes when under an hour remains', () => {
    expect(timeUntilNextFeed(NOW - (19 * HOUR + 30 * 60 * 1000), NOW)).toBe('30m');
  });

  test('shows hours and minutes when both are non-zero', () => {
    expect(timeUntilNextFeed(NOW - (17 * HOUR + 30 * 60 * 1000), NOW)).toBe('2h 30m');
  });
});

describe('canFeed', () => {
  const NOW = 1_000_000_000_000;

  test('returns true when never fed before', () => {
    expect(canFeed(null, NOW)).toBe(true);
  });

  test('returns true when 20+ hours have passed', () => {
    expect(canFeed(NOW - FEED_COOLDOWN_MS, NOW)).toBe(true);
  });

  test('returns false when under 20 hours have passed', () => {
    expect(canFeed(NOW - FEED_COOLDOWN_MS + 1, NOW)).toBe(false);
  });
});

describe('getFeedPetStage', () => {
  test('returns stage 1 at 0 feeds', () => {
    expect(getFeedPetStage(0)).toBe(1);
  });

  test('caps at stage 6 beyond 100 feeds', () => {
    expect(getFeedPetStage(200)).toBe(6);
    expect(getFeedPetStage(999)).toBe(6);
  });

  test('advances through all stages at correct thresholds', () => {
    expect(getFeedPetStage(3)).toBe(2);
    expect(getFeedPetStage(10)).toBe(3);
    expect(getFeedPetStage(21)).toBe(4);
    expect(getFeedPetStage(50)).toBe(5);
    expect(getFeedPetStage(100)).toBe(6);
  });
});

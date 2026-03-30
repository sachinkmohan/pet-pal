import { addRecentDuration } from '../recentDurations';

describe('addRecentDuration', () => {
  test('adds first duration to empty list', () => {
    expect(addRecentDuration([], 25)).toEqual([25]);
  });

  test('prepends new duration to existing list', () => {
    expect(addRecentDuration([25], 30)).toEqual([30, 25]);
  });

  test('moves duplicate to front without repeating it', () => {
    expect(addRecentDuration([25, 30], 25)).toEqual([25, 30]);
  });

  test('caps list at 3, dropping the oldest', () => {
    expect(addRecentDuration([25, 30, 15], 10)).toEqual([10, 25, 30]);
  });

  test('duplicate moved to front still respects cap of 3', () => {
    expect(addRecentDuration([25, 30, 15], 30)).toEqual([30, 25, 15]);
  });
});

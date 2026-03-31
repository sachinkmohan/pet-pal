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

  test('caps list at 5, dropping the oldest', () => {
    expect(addRecentDuration([25, 30, 15, 45, 20], 10)).toEqual([10, 25, 30, 15, 45]);
  });

  test('duplicate moved to front still respects cap of 5', () => {
    expect(addRecentDuration([25, 30, 15, 45, 20], 30)).toEqual([30, 25, 15, 45, 20]);
  });

  test('list of 3 entries still works below cap', () => {
    expect(addRecentDuration([25, 30, 15], 10)).toEqual([10, 25, 30, 15]);
  });
});

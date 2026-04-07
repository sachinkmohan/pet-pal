import {
  parseDuration,
  stripDuration,
  createTask,
  shouldCarryOver,
  filterForNewDay,
  buildRolling7Days,
  processTaskInput,
  type Task,
} from '../TaskService';

// ── parseDuration ─────────────────────────────────────────────────────────────

describe('parseDuration', () => {
  test('tracer bullet: "Review PR 10m" → 600', () => {
    expect(parseDuration('Review PR 10m')).toBe(600);
  });

  test('"Deep work 2h 30m" → 9000', () => {
    expect(parseDuration('Deep work 2h 30m')).toBe(9000);
  });

  test('"Focus 1h" → 3600', () => {
    expect(parseDuration('Focus 1h')).toBe(3600);
  });

  test('"Meeting 1h30m" → 5400 (no space between h and m)', () => {
    expect(parseDuration('Meeting 1h30m')).toBe(5400);
  });

  test('"Study 90m" → 5400 (minutes only > 60)', () => {
    expect(parseDuration('Study 90m')).toBe(5400);
  });

  test('"45m" → 2700 (just duration, no task name)', () => {
    expect(parseDuration('45m')).toBe(2700);
  });

  test('"Review PR" → null (no duration)', () => {
    expect(parseDuration('Review PR')).toBeNull();
  });

  test('empty string → null', () => {
    expect(parseDuration('')).toBeNull();
  });

  test('"10m review PR" → null (duration must be at end)', () => {
    expect(parseDuration('10m review PR')).toBeNull();
  });

  test('"Task 0m" → null (zero minutes)', () => {
    expect(parseDuration('Task 0m')).toBeNull();
  });

  test('"Task 0h" → null (zero hours)', () => {
    expect(parseDuration('Task 0h')).toBeNull();
  });

  test('case insensitive: "Task 2H 30M" → 9000', () => {
    expect(parseDuration('Task 2H 30M')).toBe(9000);
  });
});

// ── stripDuration ─────────────────────────────────────────────────────────────

describe('stripDuration', () => {
  test('tracer bullet: "Deep work 2h 30m" → "Deep work"', () => {
    expect(stripDuration('Deep work 2h 30m')).toBe('Deep work');
  });

  test('"Review PR 10m" → "Review PR"', () => {
    expect(stripDuration('Review PR 10m')).toBe('Review PR');
  });

  test('"Focus 1h" → "Focus"', () => {
    expect(stripDuration('Focus 1h')).toBe('Focus');
  });

  test('"Meeting 1h30m" → "Meeting"', () => {
    expect(stripDuration('Meeting 1h30m')).toBe('Meeting');
  });

  test('no duration → returns original trimmed', () => {
    expect(stripDuration('Review PR')).toBe('Review PR');
  });

  test('extra spaces trimmed from result', () => {
    expect(stripDuration('  Deep work 2h  ')).toBe('Deep work');
  });
});

// ── createTask ────────────────────────────────────────────────────────────────

describe('createTask', () => {
  test('tracer bullet: creates task with correct shape', () => {
    const task = createTask('Review PR 10m');
    expect(task).toMatchObject({
      text: 'Review PR 10m',
      displayName: 'Review PR',
      durationSeconds: 600,
      completed: false,
      completedAt: null,
    });
    expect(typeof task.id).toBe('string');
    expect(task.id.length).toBeGreaterThan(0);
    expect(typeof task.createdAt).toBe('string');
  });

  test('no duration → durationSeconds is null, displayName equals trimmed text', () => {
    const task = createTask('Review PR');
    expect(task.durationSeconds).toBeNull();
    expect(task.displayName).toBe('Review PR');
  });

  test('two tasks created in sequence have unique ids', () => {
    const a = createTask('Task A');
    const b = createTask('Task B');
    expect(a.id).not.toBe(b.id);
  });

  test('createdAt is a valid ISO date string', () => {
    const task = createTask('Test');
    expect(() => new Date(task.createdAt)).not.toThrow();
    expect(new Date(task.createdAt).getFullYear()).toBeGreaterThanOrEqual(2024);
  });
});

// ── shouldCarryOver ───────────────────────────────────────────────────────────

describe('shouldCarryOver', () => {
  test('tracer bullet: yesterday → true', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(shouldCarryOver(yesterday.toISOString(), new Date().toISOString())).toBe(true);
  });

  test('same day → false', () => {
    const now = new Date().toISOString();
    expect(shouldCarryOver(now, now)).toBe(false);
  });

  test('null lastDate → false (fresh install, no carry-over needed)', () => {
    expect(shouldCarryOver(null, new Date().toISOString())).toBe(false);
  });

  test('two days ago → true', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(shouldCarryOver(twoDaysAgo.toISOString(), new Date().toISOString())).toBe(true);
  });
});

// ── filterForNewDay ───────────────────────────────────────────────────────────

describe('filterForNewDay', () => {
  function makeTask(overrides: Partial<Task> = {}): Task {
    return {
      id: '1',
      text: 'Test',
      displayName: 'Test',
      durationSeconds: null,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      ...overrides,
    };
  }

  test('tracer bullet: splits completed and incomplete', () => {
    const tasks = [
      makeTask({ id: '1', completed: true }),
      makeTask({ id: '2', completed: false }),
      makeTask({ id: '3', completed: true }),
    ];
    const { completed, incomplete } = filterForNewDay(tasks);
    expect(completed).toHaveLength(2);
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].id).toBe('2');
  });

  test('all completed → completed array has all, incomplete empty', () => {
    const tasks = [makeTask({ completed: true }), makeTask({ completed: true })];
    const { completed, incomplete } = filterForNewDay(tasks);
    expect(completed).toHaveLength(2);
    expect(incomplete).toHaveLength(0);
  });

  test('all incomplete → incomplete array has all, completed empty', () => {
    const tasks = [makeTask({ completed: false }), makeTask({ completed: false })];
    const { completed, incomplete } = filterForNewDay(tasks);
    expect(completed).toHaveLength(0);
    expect(incomplete).toHaveLength(2);
  });

  test('empty list → both arrays empty', () => {
    const { completed, incomplete } = filterForNewDay([]);
    expect(completed).toHaveLength(0);
    expect(incomplete).toHaveLength(0);
  });
});

// ── buildRolling7Days ─────────────────────────────────────────────────────────

describe('buildRolling7Days', () => {
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  test('tracer bullet: returns array of length 7', () => {
    const result = buildRolling7Days([], new Date());
    expect(result).toHaveLength(7);
  });

  test('all zeros when no completions', () => {
    const result = buildRolling7Days([], new Date());
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test('completion today increments last bucket (index 6)', () => {
    const now = new Date();
    const completions = [{ completedAt: now.toISOString() }];
    const result = buildRolling7Days(completions, now);
    expect(result[6]).toBe(1);
  });

  test('completion yesterday increments index 5', () => {
    const now = new Date();
    const completions = [{ completedAt: daysAgo(1) }];
    const result = buildRolling7Days(completions, now);
    expect(result[5]).toBe(1);
    expect(result[6]).toBe(0);
  });

  test('completion 6 days ago increments index 0', () => {
    const now = new Date();
    const completions = [{ completedAt: daysAgo(6) }];
    const result = buildRolling7Days(completions, now);
    expect(result[0]).toBe(1);
  });

  test('completion 7+ days ago is excluded', () => {
    const now = new Date();
    const completions = [{ completedAt: daysAgo(7) }];
    const result = buildRolling7Days(completions, now);
    expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test('multiple completions on same day accumulate', () => {
    const now = new Date();
    const completions = [
      { completedAt: now.toISOString() },
      { completedAt: now.toISOString() },
      { completedAt: now.toISOString() },
    ];
    const result = buildRolling7Days(completions, now);
    expect(result[6]).toBe(3);
  });

  test('completions spread across different days bucket correctly', () => {
    const now = new Date();
    const completions = [
      { completedAt: daysAgo(0) },
      { completedAt: daysAgo(0) },
      { completedAt: daysAgo(3) },
      { completedAt: daysAgo(6) },
    ];
    const result = buildRolling7Days(completions, now);
    expect(result[6]).toBe(2); // today
    expect(result[3]).toBe(1); // 3 days ago
    expect(result[0]).toBe(1); // 6 days ago
  });
});

// ── processTaskInput ──────────────────────────────────────────────────────────

describe('processTaskInput', () => {
  test('tracer bullet: duration at end → displayText stripped, durationSeconds set', () => {
    const result = processTaskInput('Review PR 10m', null);
    expect(result.displayText).toBe('Review PR');
    expect(result.durationSeconds).toBe(600);
  });

  test('empty string → displayText empty, durationSeconds null (clears badge)', () => {
    const result = processTaskInput('', 600);
    expect(result.displayText).toBe('');
    expect(result.durationSeconds).toBeNull();
  });

  test('non-empty text with no duration → preserves existing badge', () => {
    const result = processTaskInput('Review PR more', 600);
    expect(result.displayText).toBe('Review PR more');
    expect(result.durationSeconds).toBe(600);
  });

  test('no duration and no existing badge → durationSeconds stays null', () => {
    const result = processTaskInput('Just a task', null);
    expect(result.displayText).toBe('Just a task');
    expect(result.durationSeconds).toBeNull();
  });

  test('new duration replaces existing badge', () => {
    const result = processTaskInput('Deep work 2h', 600);
    expect(result.displayText).toBe('Deep work');
    expect(result.durationSeconds).toBe(7200);
  });
});

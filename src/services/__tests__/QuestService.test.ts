import {
  selectTodaysQuest,
  getTodayDateString,
  isQuestStale,
  isQuestComplete,
  evaluateProgress,
  createFreshQuestState,
  QUEST_DEFINITIONS,
  type QuestId,
  type DailyQuestState,
} from '../QuestService';

const ALL_IDS: QuestId[] = [
  'early_bird',
  'long_sit',
  'quality_time',
  'consistency',
  'care_package',
];

// Helpers
const TODAY = getTodayDateString();
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

function makeState(overrides: Partial<DailyQuestState> = {}): DailyQuestState {
  return {
    date: TODAY,
    questId: 'early_bird',
    completed: false,
    claimed: false,
    progress: 0,
    ...overrides,
  };
}

// ── selectTodaysQuest ─────────────────────────────────────────────────────────

describe('selectTodaysQuest', () => {
  test('tracer bullet: returns a QuestDefinition with a known id', () => {
    const quest = selectTodaysQuest(0);
    expect(ALL_IDS).toContain(quest.id);
  });

  test('cycles through all 5 quest types across 5 consecutive days', () => {
    const ids = [0, 1, 2, 3, 4].map((i) => selectTodaysQuest(i).id);
    expect(new Set(ids).size).toBe(5);
  });

  test('same dayIndex always returns same quest (deterministic)', () => {
    expect(selectTodaysQuest(7).id).toBe(selectTodaysQuest(7).id);
  });
});

// ── getTodayDateString ────────────────────────────────────────────────────────

describe('getTodayDateString', () => {
  test('returns YYYY-MM-DD format', () => {
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('matches local date (not UTC offset)', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(getTodayDateString()).toBe(expected);
  });
});

// ── isQuestStale ──────────────────────────────────────────────────────────────

describe('isQuestStale', () => {
  test('returns false for today', () => {
    expect(isQuestStale(makeState({ date: TODAY }))).toBe(false);
  });

  test('returns true for yesterday', () => {
    expect(isQuestStale(makeState({ date: YESTERDAY }))).toBe(true);
  });
});

// ── isQuestComplete ───────────────────────────────────────────────────────────

describe('isQuestComplete', () => {
  test('returns true when progress meets target', () => {
    const def = QUEST_DEFINITIONS.early_bird;
    expect(isQuestComplete(makeState({ progress: 1 }), def)).toBe(true);
  });

  test('returns false when progress below target', () => {
    const def = QUEST_DEFINITIONS.early_bird;
    expect(isQuestComplete(makeState({ progress: 0 }), def)).toBe(false);
  });

  test('quality_time: true when minutes >= 30', () => {
    const def = QUEST_DEFINITIONS.quality_time;
    const s = makeState({ questId: 'quality_time', progress: 30 });
    expect(isQuestComplete(s, def)).toBe(true);
  });
});

// ── evaluateProgress ──────────────────────────────────────────────────────────

describe('evaluateProgress — early_bird', () => {
  const def = QUEST_DEFINITIONS.early_bird;
  const before = new Date();
  before.setHours(8, 0, 0, 0);
  const after = new Date();
  after.setHours(13, 0, 0, 0);

  test('session before noon increments progress to 1', () => {
    const s = makeState({ questId: 'early_bird' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 25, startedAt: before }, def);
    expect(result.progress).toBe(1);
    expect(result.completed).toBe(true);
  });

  test('session after noon does not increment', () => {
    const s = makeState({ questId: 'early_bird' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 25, startedAt: after }, def);
    expect(result.progress).toBe(0);
    expect(result.completed).toBe(false);
  });

  test('feed event is ignored', () => {
    const s = makeState({ questId: 'early_bird' });
    const result = evaluateProgress(s, { type: 'feed' }, def);
    expect(result.progress).toBe(0);
  });

  test('already completed → returns state unchanged', () => {
    const s = makeState({ questId: 'early_bird', completed: true, progress: 1 });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 25, startedAt: before }, def);
    expect(result).toBe(s); // same reference
  });
});

describe('evaluateProgress — long_sit', () => {
  const def = QUEST_DEFINITIONS.long_sit;
  const now = new Date();

  test('session >= 20 min completes the quest', () => {
    const s = makeState({ questId: 'long_sit' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 20, startedAt: now }, def);
    expect(result.progress).toBe(1);
    expect(result.completed).toBe(true);
  });

  test('session < 20 min does not increment', () => {
    const s = makeState({ questId: 'long_sit' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 19, startedAt: now }, def);
    expect(result.progress).toBe(0);
  });
});

describe('evaluateProgress — quality_time', () => {
  const def = QUEST_DEFINITIONS.quality_time;
  const now = new Date();

  test('session adds minutes to progress', () => {
    const s = makeState({ questId: 'quality_time' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 15, startedAt: now }, def);
    expect(result.progress).toBe(15);
    expect(result.completed).toBe(false);
  });

  test('multiple sessions accumulate to reach 30 min target', () => {
    const s = makeState({ questId: 'quality_time', progress: 20 });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 10, startedAt: now }, def);
    expect(result.progress).toBe(30);
    expect(result.completed).toBe(true);
  });
});

describe('evaluateProgress — consistency', () => {
  const def = QUEST_DEFINITIONS.consistency;
  const now = new Date();

  test('first session increments to 1', () => {
    const s = makeState({ questId: 'consistency' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 10, startedAt: now }, def);
    expect(result.progress).toBe(1);
    expect(result.completed).toBe(false);
  });

  test('second session completes the quest', () => {
    const s = makeState({ questId: 'consistency', progress: 1 });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 10, startedAt: now }, def);
    expect(result.progress).toBe(2);
    expect(result.completed).toBe(true);
  });
});

describe('evaluateProgress — care_package', () => {
  const def = QUEST_DEFINITIONS.care_package;
  const now = new Date();

  test('feed event sets bit 0 (progress = 1)', () => {
    const s = makeState({ questId: 'care_package' });
    const result = evaluateProgress(s, { type: 'feed' }, def);
    expect(result.progress).toBe(1);
    expect(result.completed).toBe(false);
  });

  test('session event sets bit 1 (progress = 2)', () => {
    const s = makeState({ questId: 'care_package' });
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 10, startedAt: now }, def);
    expect(result.progress).toBe(2);
    expect(result.completed).toBe(false);
  });

  test('feed then session sets both bits (progress = 3, completed)', () => {
    const s = makeState({ questId: 'care_package', progress: 1 }); // already fed
    const result = evaluateProgress(s, { type: 'session', durationMinutes: 10, startedAt: now }, def);
    expect(result.progress).toBe(3);
    expect(result.completed).toBe(true);
  });

  test('duplicate feed does not change progress when bit already set', () => {
    const s = makeState({ questId: 'care_package', progress: 1 });
    const result = evaluateProgress(s, { type: 'feed' }, def);
    expect(result.progress).toBe(1); // bit OR is idempotent
  });
});

// ── createFreshQuestState ─────────────────────────────────────────────────────

describe('createFreshQuestState', () => {
  test('returns state with today date', () => {
    const s = createFreshQuestState(0);
    expect(s.date).toBe(TODAY);
  });

  test('returns state with progress=0, completed=false, claimed=false', () => {
    const s = createFreshQuestState(0);
    expect(s.progress).toBe(0);
    expect(s.completed).toBe(false);
    expect(s.claimed).toBe(false);
  });

  test('questId matches selectTodaysQuest for same dayIndex', () => {
    const s = createFreshQuestState(3);
    expect(s.questId).toBe(selectTodaysQuest(3).id);
  });
});

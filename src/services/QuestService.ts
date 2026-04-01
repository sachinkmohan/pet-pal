// QuestService — pure logic only, no storage/RN deps

export type QuestId =
  | 'early_bird'
  | 'long_sit'
  | 'quality_time'
  | 'consistency'
  | 'care_package';

export type ProgressMode = 'count' | 'minutes' | 'bits';

export type QuestDefinition = {
  id: QuestId;
  name: string;
  description: string;
  progressMode: ProgressMode;
  target: number;
  icon: string;
};

export type DailyQuestState = {
  date: string;       // YYYY-MM-DD local time
  questId: QuestId;
  completed: boolean;
  claimed: boolean;
  progress: number;
};

export type QuestEvent =
  | { type: 'session'; durationMinutes: number; startedAt: Date }
  | { type: 'feed' };

export const QUEST_COINS_REWARD = 50;

export const QUEST_DEFINITIONS: Record<QuestId, QuestDefinition> = {
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Do a session before noon',
    progressMode: 'count',
    target: 1,
    icon: '🌅',
  },
  long_sit: {
    id: 'long_sit',
    name: 'The Long Sit',
    description: 'Do one session longer than 20 min',
    progressMode: 'count',
    target: 1,
    icon: '⏳',
  },
  quality_time: {
    id: 'quality_time',
    name: 'Quality Time',
    description: 'Spend 30 total minutes with Pochi today',
    progressMode: 'minutes',
    target: 30,
    icon: '💛',
  },
  consistency: {
    id: 'consistency',
    name: 'Consistency',
    description: 'Do 2 sessions today',
    progressMode: 'count',
    target: 2,
    icon: '🔁',
  },
  care_package: {
    id: 'care_package',
    name: 'Care Package',
    description: 'Feed Pochi and complete a session',
    progressMode: 'bits',
    target: 3, // bit 0 = fed, bit 1 = session done; 0b11 = 3
    icon: '🎁',
  },
};

const QUEST_ORDER: QuestId[] = [
  'early_bird',
  'long_sit',
  'quality_time',
  'consistency',
  'care_package',
];

export function selectTodaysQuest(dayIndex: number): QuestDefinition {
  const id = QUEST_ORDER[dayIndex % QUEST_ORDER.length];
  return QUEST_DEFINITIONS[id];
}

export function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isQuestStale(state: DailyQuestState): boolean {
  return state.date !== getTodayDateString();
}

export function isQuestComplete(
  state: DailyQuestState,
  questDef: QuestDefinition,
): boolean {
  return state.progress >= questDef.target;
}

export function evaluateProgress(
  state: DailyQuestState,
  event: QuestEvent,
  questDef: QuestDefinition,
): DailyQuestState {
  if (state.completed) return state;

  let next = state.progress;

  switch (questDef.id) {
    case 'early_bird': {
      if (event.type === 'session' && event.startedAt.getHours() < 12) {
        next = Math.min(next + 1, questDef.target);
      }
      break;
    }
    case 'long_sit': {
      if (event.type === 'session' && event.durationMinutes >= 20) {
        next = Math.min(next + 1, questDef.target);
      }
      break;
    }
    case 'quality_time': {
      if (event.type === 'session') {
        next = next + event.durationMinutes;
      }
      break;
    }
    case 'consistency': {
      if (event.type === 'session') {
        next = Math.min(next + 1, questDef.target);
      }
      break;
    }
    case 'care_package': {
      if (event.type === 'feed') {
        next = next | 1; // set bit 0
      } else if (event.type === 'session') {
        next = next | 2; // set bit 1
      }
      break;
    }
  }

  const completed = next >= questDef.target;
  return { ...state, progress: next, completed };
}

export function createFreshQuestState(dayIndex: number): DailyQuestState {
  const quest = selectTodaysQuest(dayIndex);
  return {
    date: getTodayDateString(),
    questId: quest.id,
    completed: false,
    claimed: false,
    progress: 0,
  };
}

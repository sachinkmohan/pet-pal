// Mood states
export type MoodState = 'thriving' | 'happy' | 'okay' | 'tired' | 'sick';

export const MOOD_CONFIG: Record<
  MoodState,
  { emoji: string; label: string; messages: string[] }
> = {
  thriving: {
    emoji: '🌟',
    label: 'Thriving',
    messages: [
      "I'm so happy! Keep up the great work!",
      "You're amazing! I feel full of energy!",
      'Best day ever! 🎉',
    ],
  },
  happy: {
    emoji: '😊',
    label: 'Happy',
    messages: [
      "Good job! I'm feeling great!",
      "We're doing well today!",
      'Thanks for focusing with me!',
    ],
  },
  okay: {
    emoji: '😐',
    label: 'Okay',
    messages: [
      "I'm alright... could use more focus time.",
      "Feeling so-so today.",
      'A focus session would really help!',
    ],
  },
  tired: {
    emoji: '😴',
    label: 'Tired',
    messages: [
      "I'm sleepy... please focus with me.",
      "Don't forget about me today!",
      "I need some attention...",
    ],
  },
  sick: {
    emoji: '🤒',
    label: 'Sick',
    messages: [
      "I'm not feeling well... please help me recover.",
      'Feed me and focus with me to feel better!',
      'I miss spending time with you...',
    ],
  },
};

// Evolution stages
export type EvolutionStage =
  | 'egg'
  | 'baby_chick'
  | 'fluffy_chick'
  | 'teen_bird'
  | 'adult_eagle'
  | 'legendary';

export const EVOLUTION_CONFIG: Record<
  EvolutionStage,
  { emoji: string; name: string; sessionsRequired: number; unlockReward: string }
> = {
  egg: {
    emoji: '🥚',
    name: 'Egg',
    sessionsRequired: 0,
    unlockReward: 'Starting state',
  },
  baby_chick: {
    emoji: '🐣',
    name: 'Baby Chick',
    sessionsRequired: 10,
    unlockReward: 'New food options',
  },
  fluffy_chick: {
    emoji: '🐥',
    name: 'Fluffy Chick',
    sessionsRequired: 25,
    unlockReward: 'Accessories slot',
  },
  teen_bird: {
    emoji: '🐦',
    name: 'Teen Bird',
    sessionsRequired: 50,
    unlockReward: 'New background theme',
  },
  adult_eagle: {
    emoji: '🦅',
    name: 'Adult Eagle',
    sessionsRequired: 100,
    unlockReward: 'Special animation',
  },
  legendary: {
    emoji: '🦄',
    name: 'Legendary',
    sessionsRequired: 200,
    unlockReward: 'Shareable card + badge',
  },
};

export const EVOLUTION_ORDER: EvolutionStage[] = [
  'egg',
  'baby_chick',
  'fluffy_chick',
  'teen_bird',
  'adult_eagle',
  'legendary',
];

export function getEvolutionStage(totalSessions: number): EvolutionStage {
  const stages = [...EVOLUTION_ORDER].reverse();
  for (const stage of stages) {
    if (totalSessions >= EVOLUTION_CONFIG[stage].sessionsRequired) {
      return stage;
    }
  }
  return 'egg';
}

export function getNextEvolutionStage(
  current: EvolutionStage
): EvolutionStage | null {
  const index = EVOLUTION_ORDER.indexOf(current);
  if (index === -1 || index === EVOLUTION_ORDER.length - 1) return null;
  return EVOLUTION_ORDER[index + 1];
}

export function sessionsToNextEvolution(
  totalSessions: number,
  current: EvolutionStage
): number | null {
  const next = getNextEvolutionStage(current);
  if (!next) return null;
  return EVOLUTION_CONFIG[next].sessionsRequired - totalSessions;
}

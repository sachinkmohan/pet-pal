// QuestStorage — thin storage wiring for the quest system

import { getItem, setItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';
import {
  createFreshQuestState,
  evaluateProgress,
  isQuestComplete,
  isQuestStale,
  QUEST_COINS_REWARD,
  QUEST_DEFINITIONS,
  type DailyQuestState,
  type QuestEvent,
} from './QuestService';

function dayIndex(): number {
  return Math.floor(Date.now() / 86400000);
}

export async function loadOrInitQuestState(): Promise<DailyQuestState> {
  const stored = await getItem<DailyQuestState>(STORAGE_KEYS.DAILY_QUEST);
  if (!stored || isQuestStale(stored)) {
    const fresh = createFreshQuestState(dayIndex());
    await setItem(STORAGE_KEYS.DAILY_QUEST, fresh);
    return fresh;
  }
  return stored;
}

export async function recordQuestEvent(event: QuestEvent): Promise<DailyQuestState> {
  const state = await loadOrInitQuestState();
  if (state.claimed) return state;

  const questDef = QUEST_DEFINITIONS[state.questId];
  const next = evaluateProgress(state, event, questDef);
  await setItem(STORAGE_KEYS.DAILY_QUEST, next);
  return next;
}

export async function claimQuestReward(): Promise<{ newCoinTotal: number; success: boolean }> {
  const state = await loadOrInitQuestState();
  const questDef = QUEST_DEFINITIONS[state.questId];

  if (!isQuestComplete(state, questDef) || state.claimed) {
    const currentCoins = (await getItem<number>(STORAGE_KEYS.COINS)) ?? 0;
    return { newCoinTotal: currentCoins, success: false };
  }

  const currentCoins = (await getItem<number>(STORAGE_KEYS.COINS)) ?? 0;
  const newCoinTotal = currentCoins + QUEST_COINS_REWARD;

  await Promise.all([
    setItem(STORAGE_KEYS.COINS, newCoinTotal),
    setItem(STORAGE_KEYS.DAILY_QUEST, { ...state, claimed: true }),
  ]);

  return { newCoinTotal, success: true };
}

export async function getCoins(): Promise<number> {
  return (await getItem<number>(STORAGE_KEYS.COINS)) ?? 0;
}

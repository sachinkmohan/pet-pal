# Quest System

## Overview

One quest per day. Completing it earns 🪙 coins. Quests reset at midnight and are picked deterministically — the same quest shows all day regardless of how many times the app is opened.

---

## How It Works

1. App opens → `loadOrInitQuestState()` checks storage
2. If no quest exists for today, a fresh one is generated from the day index
3. User completes the condition (session, feed, or both)
4. Progress updates automatically in the background — no manual tracking needed
5. User opens the Quests tab, sees the quest marked complete, taps **Claim!**
6. +50 🪙 coins are added to their balance
7. At midnight the cycle resets

---

## Quest Types

| ID | Name | Condition | Icon |
|---|---|---|---|
| `early_bird` | Early Bird | Complete a session before 12:00 PM | 🌅 |
| `long_sit` | The Long Sit | Complete a single session ≥ 20 minutes | ⏳ |
| `quality_time` | Quality Time | Accumulate 30 total minutes across sessions | 💛 |
| `consistency` | Consistency | Complete 2 sessions in a day | 🔁 |
| `care_package` | Care Package | Both feed Mochi AND complete a session | 🎁 |

Quests rotate daily using `dayIndex % 5` (days since Unix epoch), so the same type never repeats two days in a row.

---

## Rewards

| Action | Reward |
|---|---|
| Complete daily quest | +50 🪙 coins |

Coins accumulate and are visible on both the **Home** screen and the **Quests** tab. They are the soft currency — future shop items will be purchased with coins.

---

## Storage

All quest state lives in `AsyncStorage` under two keys:

**`daily_quest`** — current quest state (JSON)
```ts
{
  date: string;       // "YYYY-MM-DD" local time — used to detect staleness
  questId: QuestId;   // which quest is active today
  completed: boolean; // true when progress condition is met
  claimed: boolean;   // true after user taps Claim (prevents double-award)
  progress: number;   // meaning depends on quest type (see below)
}
```

**`coins`** — running coin balance (number)

### Progress field by quest type

| Quest | Progress meaning |
|---|---|
| `early_bird` | 0 or 1 (count) |
| `long_sit` | 0 or 1 (count) |
| `quality_time` | total minutes accumulated (number) |
| `consistency` | sessions completed today (0–2) |
| `care_package` | bit flags — bit 0 = fed, bit 1 = session done (0/1/2/3) |

`care_package` uses bit flags so either action (feed or session) can happen in any order. Both bits set (value = 3) = complete.

---

## Code Layout

```
src/services/QuestService.ts    — pure logic, no storage deps
src/services/QuestStorage.ts    — storage wiring (load, record, claim)
src/services/__tests__/
  QuestService.test.ts          — 27 unit tests covering all quest types
app/(tabs)/quests.tsx           — Quests tab screen
```

### Key functions

**QuestService.ts** (pure — safe to unit test without mocks)
- `selectTodaysQuest(dayIndex)` — returns today's `QuestDefinition`
- `evaluateProgress(state, event, def)` — returns updated state (immutable)
- `isQuestComplete(state, def)` — returns true when condition is met
- `isQuestStale(state)` — returns true if `state.date` is not today
- `createFreshQuestState(dayIndex)` — returns a blank state for today

**QuestStorage.ts** (storage wiring)
- `loadOrInitQuestState()` — loads from storage, resets if stale
- `recordQuestEvent(event)` — called after session save or feed complete
- `claimQuestReward()` — awards coins, marks quest claimed
- `getCoins()` — returns current coin balance

### Event hooks

Progress updates are fired automatically from existing flows:

| Trigger | Location | Event |
|---|---|---|
| Session saved | `app/(tabs)/focus.tsx` → `saveSessionData()` | `{ type: 'session', durationMinutes, startedAt }` |
| Feed completed | `app/feed.tsx` → `handleTap()` (3rd tap) | `{ type: 'feed' }` |

Neither screen knows about quest logic — they just fire an event and the service handles everything.

---

## Future (v2)

- Quest streak bonus (7-day streak → bonus coins)
- Expanded pool (9+ quest types)
- Quest notifications ("Your quest is waiting!")
- Gems 💎 as hard/premium currency (watch ads or purchase)
- Shop — spend coins on cosmetics or accessories

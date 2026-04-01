# Pochi — Daily Quest System (MVP Design Doc)

## Overview

A daily quest system that gives users a reason to open the app every day beyond feeding and focus sessions. One quest per day, rotating across 5 types, rewarding 🪙 Coins (soft currency).

---

## How It Works

- One quest per day, resets at **midnight**
- Quest is picked **deterministically** using the date as a seed (same quest for the whole day, no randomness on re-open)
- 5 quest types in the pool, cycling so the same type doesn't repeat two days in a row
- Completing the quest awards **🪙 Coins** (soft currency for the future shop)

---

## The Quest Pool (5 Types)

| Quest ID | Display Name | Description | Completion Condition |
|---|---|---|---|
| `early_bird` | Early Bird | "Do a session before noon" | 1 session completed before 12:00pm |
| `long_sit` | The Long Sit | "Do one session longer than 20 min" | Single session ≥ 20 minutes |
| `quality_time` | Quality Time | "Spend 30 total minutes with Pochi today" | Cumulative session time ≥ 30 min |
| `consistency` | Consistency | "Do 2 sessions today" | 2 sessions completed |
| `care_package` | Care Package | "Feed Pochi and complete a session" | Both feed + session done (any order) |

Every quest is completable in a single sitting, but each feels meaningfully different.

---

## Coin Rewards

- Each quest completion = **+50 🪙 Coins**
- Coins are the soft currency — accumulated for future shop purchases
- No streak bonus for quests at MVP (defer to v2)

---

## Storage Schema (AsyncStorage)

```js
dailyQuest: {
  date: "2025-04-01",       // used to detect if quest is stale
  questId: "early_bird",    // which quest is active today
  completed: false,         // whether the user has completed it
  progress: { ... }         // quest-specific tracking (see below)
}
```

On app open, check if `date` matches today. If not, generate a fresh quest and reset progress.

### Progress Shape Per Quest Type

```js
// early_bird
progress: { sessionDoneBeforeNoon: false }

// long_sit
progress: { longestSessionMinutes: 0 }

// quality_time
progress: { totalMinutesToday: 0 }

// consistency
progress: { sessionsCompleted: 0 }

// care_package
progress: { fed: false, sessionDone: false }
```

---

## Quest Selection Logic

```js
const QUESTS = ['early_bird', 'long_sit', 'quality_time', 'consistency', 'care_package'];

function getTodaysQuest() {
  const dayIndex = Math.floor(Date.now() / 86400000); // days since epoch
  return QUESTS[dayIndex % QUESTS.length];
}
```

- Deterministic — no randomness, same result on every app open
- No storage needed for the selection itself
- Naturally prevents the same quest from repeating two days in a row

---

## What to Build

### 1. `QuestService.js`
- `getTodaysQuest()` — returns current quest ID
- `loadQuestState()` — reads from AsyncStorage, resets if date is stale
- `updateQuestProgress(event)` — called after session complete or feed action
- `checkQuestCompletion()` — returns `true` if quest conditions are met
- `claimQuestReward()` — adds +50 Coins to coin balance

### 2. Quest Card UI Component
- Displayed on the Home screen
- Shows: quest name, description, progress indicator, 🪙 coin reward badge
- On completion: show a success state + floating coin animation
- Disappears or shows "Completed ✓" state for the rest of the day

### 3. Hook Into Existing Flows
- Session completion → call `updateQuestProgress({ type: 'session', durationMinutes, startedAt })`
- Feed action → call `updateQuestProgress({ type: 'feed' })`

### 4. Completion Reward
- Award +50 🪙 Coins → update coin balance in AsyncStorage
- Trigger floating coin animation (Animated API, not Lottie)
- Mark quest as claimed in storage

---

## Build Estimate

| Task | Effort |
|---|---|
| `QuestService.js` | ~1 session |
| Quest card UI component | ~0.5 session |
| Hook into session + feed flows | ~0.5 session |
| **Total** | **~2 sessions** |

---

## Future (v2) Ideas

- Quest streak bonus (complete 7 days in a row → bonus Coins)
- Weekly mega-quest with a bigger reward (accessory unlock)
- Difficulty tiers (easy / normal / challenge quests)
- Quest notifications ("Your daily quest is waiting, Pochi is excited!")
- Expand pool to 9+ quest types for more variety

---

*Part of the Pochi MVP build plan. See PETPAL_BUILD_PLAN_REFINED.md for phase integration.*

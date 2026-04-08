# Tasks Screen (PET-14)

Replaces the Journey tab. Lets users add tasks with optional durations, launch a 2-minute warm-up before the real session, earn coins on completion, and track a rolling 7-day history.

---

## Tab

| Property | Value |
|---|---|
| Route | `app/(tabs)/tasks.tsx` |
| Tab position | 5 (Home · Quests · Step Away · Stats · **Tasks**) |
| Icon | `checklist` |
| Replaces | Journey tab |

---

## Task model

```ts
type Task = {
  id: string;
  text: string;           // raw input e.g. "Review PR 10m"
  displayName: string;    // stripped e.g. "Review PR"
  durationSeconds: number | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
};
```

---

## Core behaviours

### Inline duration detection

Typing `Review PR 10m` automatically strips `10m` into a removable badge — the task row shows `Review PR` with a `10m ×` chip. Updating the text to `Review PR 25m` replaces the badge. Clearing the text clears the badge.

Supported formats: `1h`, `45m`, `2h 30m`, `1h30m` (case-insensitive, must be at end of input).

Pure function: `processTaskInput(newText, existingDuration)` in `TaskService.ts`.

### One-way check-off

Tasks can be marked complete but **not unchecked**. This prevents gaming the coin system and keeps the UX simple.

### Coin reward on check-off

Formula: `max(5, round(durationSeconds / 300))` coins.

| Duration | Coins |
|---|---|
| No duration | 5 |
| 10m | 5 |
| 30m | 6 |
| 60m | 12 |

An auto-dismiss modal (`🪙 +N / Task complete!`) appears for 1.5s after check-off.

### Edit / Delete

Tapping a task row reveals **Edit** and **Delete** actions inline. Edit pre-fills the input with the task's `displayName` (duration already stripped) and restores the duration badge.

### Carry-over

On a new calendar day, incomplete tasks from the previous day are carried forward. Completed tasks are archived (moved to `POCHI_TASK_COMPLETIONS` for stats). Checked by `shouldCarryOver(lastDateISO, nowISO)`.

### Rolling 7-day stats

A number row shows completions per day for the last 7 days (today = rightmost). Zero days show `—`. Weekly total shown top-right. Powered by `buildRolling7Days(completions, now)`.

### Onboarding

A 3-step inline guide appears on first use. Re-accessible via the `?` button in the header.

---

## Storage keys

| Key | Type | Purpose |
|---|---|---|
| `POCHI_TASKS` | `Task[]` | Active task list |
| `POCHI_TASKS_LAST_DATE` | `string` (ISO) | Last-opened date for carry-over detection |
| `POCHI_TASK_COMPLETIONS` | `{ completedAt: string }[]` | Historical completions for 7-day chart |
| `POCHI_TASKS_ONBOARDING_DONE` | `boolean` | Whether onboarding has been shown |

---

## Launching a task session

Tapping the play button on a task with a duration pushes `focus.tsx` with params:

```ts
router.push({
  pathname: '/(tabs)/focus',
  params: { taskName: task.displayName, durationSeconds: task.durationSeconds },
});
```

Tasks without a duration launch an open-flow session (no fixed countdown).

---

## 2-minute pre-phase

### Purpose

Lowers activation energy. The user does 2 minutes of starting the task before the real session begins — by which point resistance has dissolved.

### Flow

```text
Task tapped → pre-phase starts (2-min CircularCountdown)
           → sticky notification fired immediately
           → 2 minutes elapse (or app resumed after 2+ min)
           → pre-phase notification dismissed
           → real session starts (CircularCountdown with task duration)
           → session notification shown
           → timer completes → completion modal → router.back()
```

### Pre-phase notification

Fired immediately when pre-phase starts (`trigger: null`, `sticky: true`):

> **2-min warm-up started ⏱️**
> Task begins at 2:32 PM · Ends at 2:57 PM

Stays in tray even if the user taps it to return to the app. Dismissed when the session starts.

### Background handling

If the user backgrounds the app during the pre-phase:

- The sticky notification remains in the tray with full timing info
- On reopen: `AppState` listener checks `Date.now() >= prePhaseEndTime`
- If elapsed: transitions immediately without waiting for the next interval tick

### Adjusted session duration

If the user opens the app after the pre-phase has already ended (e.g., 4 minutes after starting a 10-minute task):

```
overdueMs = Date.now() - prePhaseEndTime   // 2 minutes = 120_000ms
adjusted  = adjustSessionDuration(600, 120_000)  // → 480s (8 min)
```

The countdown shows `8:00`, and the session notification says `Ends at 2:12 PM` — not 2:14 PM.

Formula: `max(5, durationSeconds - round(overdueMs / 1000))`. Floor of 5 seconds ensures the countdown always mounts and fires `onComplete` promptly if the session is fully elapsed.

---

## Task completion modal

Shown when the session timer completes naturally (while app is in foreground):

> **Session done! 🎯**
> You focused 8 min on **Review PR**
> Mark it complete to earn 5 coins 🪙

Buttons: `Count this time 🌟` / `Don't save — I looked at my phone`

Both buttons navigate back to the Tasks screen via `router.back()`. Coins are awarded separately when the user checks off the task.

---

## Notification lifecycle

| Event | Notification action |
|---|---|
| Pre-phase starts | Fire sticky warm-up notification |
| 2 min elapses (in app) | Cancel warm-up → fire session notification |
| 2 min elapses (AppState resume) | Cancel warm-up → fire session notification |
| User taps notification | Nothing — notification stays |
| Give up | Cancel session notification |
| Timer completes naturally | Cancel session notification |
| Navigate away during session | Notification stays in tray |

---

## Service layer (TDD)

All pure logic lives in `src/services/TaskService.ts` and `src/services/NotificationService.ts`.

### TaskService.ts

| Function | Behaviour |
|---|---|
| `parseDuration(text)` | Returns seconds or null; duration must be at end |
| `stripDuration(text)` | Removes duration token, trims result |
| `createTask(text)` | Full Task object with stable id and ISO createdAt |
| `shouldCarryOver(lastISO, nowISO)` | True if different calendar day |
| `filterForNewDay(tasks)` | `{ completed, incomplete }` split |
| `buildRolling7Days(completions, now)` | `number[7]`; today = index 6 |
| `processTaskInput(newText, existingDuration)` | `{ displayText, durationSeconds }` |
| `calculateTaskCoins(durationSeconds)` | `max(5, round(durationSeconds / 300))` |
| `adjustSessionDuration(durationSeconds, overdueMs)` | `max(5, duration - round(overdueMs / 1000))` |

### NotificationService.ts (additions)

| Function | Behaviour |
|---|---|
| `formatCheckpointBody(durationSeconds)` | `"Your Xm session begins now."` or open-flow message |
| `formatPrePhaseBody(durationSeconds, now)` | Begin time + optional end time |
| `showPrePhaseNotification(durationSeconds)` | Sticky notification, tracks ID |
| `cancelPrePhaseNotification()` | Dismisses sticky warm-up notification |

---

## Key implementation notes

- **`CircularCountdown` key props** — `key="pre-phase"` / `key="task-session"` / `key="regular-session"` force React to unmount/remount between phases. Without keys, React reconciles both countdowns as the same instance (same tree position), leaving the old interval running in the background.
- **Stale closure fix** — `handleStart` and `handleStartOpenFlow` check `machineRef.current.getState() !== 'idle'` (not React state), so they always read the current machine state from async callbacks.
- **Float minutes** — `Math.round(totalSecs / 60)` in `handleStart` prevents fractional values accumulating in `FOCUS_TIME_TODAY`.
- **Task sessions excluded from recents** — `addRecentDuration` is skipped when `isTaskMode`; the Step Away quick-start chips only reflect free-form sessions.

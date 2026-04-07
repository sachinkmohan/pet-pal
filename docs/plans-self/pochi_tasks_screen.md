# Pochi — Tasks Screen Feature

## Overview

A dedicated screen where users can plan up to **3 tasks per day**, optionally attach a duration, and start a focus session directly from the task. Each task links into the existing 2-minute starter → flow state mechanic. Completed tasks feed into the Insights screen for weekly/daily stats.

This screen is the home of intentional, low-pressure daily planning. The 3-task limit is a feature, not a restriction — it enforces meaningful prioritisation.

---

## Core Rules

- **Maximum 3 tasks at any time.** If a task is deleted (any state), a new one can be added up to the limit of 3.
- **Tasks persist across sessions** via AsyncStorage.
- **Completed tasks** (checked off) are removed automatically after midnight.
- **Incomplete tasks** at midnight trigger a carry-over prompt on next open.
- **Duration is optional.** Tasks without a duration use the 2-minute starter → open flow state mechanic.
- **Tasks feed Insights** — daily, yesterday, last week, and weekly completion counts.

---

## User Flow

### Adding a Task
```
User opens Tasks screen
  → Taps "+ Add Task" (only visible if < 3 tasks exist)
  → Text input appears inline
  → User types task name, optionally including duration:
       "Review PR"           → no duration, uses 2-min starter + flow
       "Review PR 10m"       → session capped at 10 minutes
       "Deep work 2h 30m"    → session capped at 2 hours 30 minutes
  → Duration detected inline as user types (highlighted/badge shown)
  → User confirms (tap done / return key)
```

### Starting a Task
```
User taps Play ▶ on a task
  → Navigates to Timer screen
  → Timer screen shows:
       - Task name (only when launched from Tasks screen)
       - "Starting in 2 minutes..." label
       - 2-minute countdown timer (large, centred)
       - All other UI disabled / hidden
  → At 2 minutes: checkpoint notification fires (see 2-min starter doc)
  → If task has a duration (e.g. 10m):
       - After checkpoint, timer resets and counts down the actual duration
       - "Now starting your 10 min session" shown briefly
  → If task has no duration:
       - After checkpoint, transitions to open flow state
```

### Completing a Task
```
User returns to Tasks screen after session
  → Task shows strikethrough + muted style
  → Checkbox on the left is ticked
  → Delete button still visible on the right
  → Task count in Insights is incremented
  → Task stays visible until midnight, then auto-removed
```

### Deleting a Task
```
Delete button (🗑) visible at all times regardless of task state
  → Tap delete → task removed immediately
  → If task count was at 3, "+ Add Task" becomes visible again
  → No confirmation prompt (low-stakes, MVP)
```

---

## Duration Parsing

Detected **inline as the user types**, shown as a small badge or highlighted text within the input.

### Supported Formats

| Input | Parsed Duration |
|---|---|
| `10m` | 10 minutes |
| `45m` | 45 minutes |
| `1h` | 1 hour |
| `2h 30m` | 2 hours 30 minutes |
| `1h30m` | 1 hour 30 minutes |
| `90m` | 90 minutes |

### Parsing Logic (JavaScript)

```js
export function parseDuration(text) {
  // Match patterns like: 2h 30m, 1h30m, 45m, 10m, 1h
  const pattern = /(?:(\d+)h)?\s*(?:(\d+)m)?/i;
  const match = text.match(pattern);
  if (!match || (!match[1] && !match[2])) return null;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const totalSeconds = (hours * 60 + minutes) * 60;

  return totalSeconds > 0 ? totalSeconds : null;
}

// Example usage
parseDuration("Review PR 10m")     // → 600 (seconds)
parseDuration("Deep work 2h 30m")  // → 9000 (seconds)
parseDuration("Review PR")         // → null (no duration, use flow)
```

Duration is stripped from the display name when shown on the Timer screen. "Deep work 2h 30m" displays as "Deep work".

---

## Midnight Carry-Over

### Trigger
On app open, check if the last session date (stored in AsyncStorage) is before today's midnight.

### Behaviour
- **Completed tasks** → silently removed, no prompt
- **Incomplete tasks** → prompt shown before the Tasks screen loads:

```
╔══════════════════════════════════╗
║  You have tasks from yesterday   ║
║                                  ║
║  Would you like to keep your     ║
║  unfinished tasks?               ║
║                                  ║
║  [Keep Them]     [Start Fresh]   ║
╚══════════════════════════════════╝
```

- **Keep Them** → incomplete tasks carried over as-is (unchecked, no strikethrough)
- **Start Fresh** → all tasks cleared, user starts with empty list

### AsyncStorage Keys

```js
'pochi_tasks'           // Array of task objects
'pochi_tasks_last_date' // ISO date string of last active session
```

### Task Object Shape

```js
{
  id: string,           // uuid
  text: string,         // raw input text e.g. "Deep work 2h 30m"
  displayName: string,  // text with duration stripped e.g. "Deep work"
  durationSeconds: number | null,
  completed: boolean,
  completedAt: string | null, // ISO timestamp
  createdAt: string,
}
```

---

## Timer Screen Behaviour (from Tasks)

When launched from a task, the Timer screen receives:
- `taskName` — display name (duration stripped)
- `durationSeconds` — null or parsed value

| Scenario | Timer Behaviour |
|---|---|
| No duration | 2-min countdown → checkpoint → open flow state |
| With duration (e.g. 10m) | 2-min countdown → checkpoint → duration countdown → session ends |
| User taps "I'm Done" at checkpoint | Session logged as micro (2 min), task NOT auto-checked |
| User completes full duration | Session ends, task auto-checked off |
| User returns early from flow | Session logged, task NOT auto-checked (user checks manually) |

> Auto-check only triggers on full duration completion. All other cases require manual check-off by the user.

---

## Onboarding (First-Time Users)

Shown **once** on first visit to the Tasks screen. A 3-step tooltip/coach mark overlay.

### Step 1 — Adding a task with duration
```
💡 "Add up to 3 tasks for today.
    Include a duration like '10m' or '2h 30m'
    and Pochi will time your session automatically."

[highlight: text input area]
```

### Step 2 — Starting a session
```
▶  "Tap the play button to start a focus session.
    You'll begin with just 2 minutes — no pressure.
    Pochi will check in and ask if you want to keep going."

[highlight: play button on a sample task]
```

### Step 3 — Completing and managing tasks
```
✓  "Tap the circle to check off a task when you're done.
    Use the 🗑 button to delete any task at any time.
    Completed tasks are cleared at midnight automatically."

[highlight: checkbox + delete button]
```

**Onboarding storage key:** `pochi_tasks_onboarding_done` (boolean in AsyncStorage)

---

## Insights Integration

### New Metrics Added

| Metric | Description |
|---|---|
| Tasks completed today | Count of tasks checked off since midnight |
| Tasks completed yesterday | Count from the previous calendar day |
| Tasks completed this week | Mon–Sun rolling window |
| Tasks completed last week | Previous Mon–Sun window |

### Storage Approach

Task completions are logged to a running history array in AsyncStorage:

```js
'pochi_task_completions' // Array of { completedAt: ISO string }
```

Insights screen queries this array and filters by date range. No backend required.

### Insights Display (suggestion)

```
Tasks This Week
━━━━━━━━━━━━━━━━━━━━━━
Today          2 / 3
Yesterday      3 / 3  ✨
This week      11
Last week       8
```

---

## Task Screen UI Layout

```
┌─────────────────────────────────┐
│  Today's Tasks              [?] │  ← onboarding replay button
├─────────────────────────────────┤
│  ○  Review PR           10m  ▶  │
│  ○  Write tests        2h 30m▶  │
│  ✓  Reply to emails      ~~~ 🗑 │  ← completed, strikethrough
├─────────────────────────────────┤
│         + Add Task              │  ← hidden when 3 tasks exist
└─────────────────────────────────┘
```

- `○` = unchecked (tappable to mark complete)
- `✓` = checked (strikethrough style, muted colour)
- Duration badge shown inline if parsed
- `▶` play button — hidden on completed tasks
- `🗑` delete button — always visible

---

## MVP Scope

**In scope:**
- Add / delete tasks (max 3)
- Inline duration parsing
- Play → Timer screen integration
- Manual check-off with strikethrough
- Midnight carry-over prompt (keep all / discard all)
- Auto-remove completed tasks at midnight
- First-time onboarding (3 steps)
- Insights metrics (today, yesterday, this week, last week)

**Deferred post-MVP:**
- Edit a task after creation
- Reorder tasks (drag and drop)
- Per-task session history
- Carry-over prompt with individual task selection (keep/remove per task)
- Notifications reminding user to set tasks for the day
- Task templates or suggestions based on past behaviour

---

## Open Questions

1. Should the `[?]` button in the top right replay the onboarding overlay, or link to a help screen?
2. If a timed session ends (e.g. 10m completes) but the user is away from the app, should the task auto-check itself or wait for the user to confirm on return?
3. Should the weekly Insights window be Mon–Sun, or a rolling 7-day window?

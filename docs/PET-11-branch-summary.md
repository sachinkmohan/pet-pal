# PET-11 Branch Summary

## Overview

This branch covers two areas: a series of code quality improvements to the Focus
session flow, and the full implementation of the Feed mechanic (Session 14).

---

## 1. Focus Session — Improvements & Fixes

### Notification Simplification
Removed the completion notification entirely. The session-start notification already
shows the end time ("Session ends at 3:45 PM") which is sufficient. This eliminated
the Android Doze mode timing accuracy problem — no OS alarm scheduling means no delay.

### Recent Durations (Quick-Start Chips)
The static preset chips (5 / 15 / 30 / 60 min) were replaced with the user's last 3
unique saved session durations. Tapping a chip starts the session immediately.

- Stored in `STORAGE_KEYS.RECENT_DURATIONS` as `number[]`
- Pure function `addRecentDuration(existing, duration)` handles deduplication and cap
- Chips hidden on fresh install (no presets shown)
- "RECENT" label appears above chips once sessions exist
- Fully tested via TDD (5 tests)

### Code Quality Fixes
Several issues identified and verified against current code before fixing:

| Fix | Detail |
|---|---|
| `@types/jest` version mismatch | Was `^30.0.0`, corrected to `^29.5.0` to match `jest@^29.7.0` |
| Blur cleanup missing `cancelSessionNotification()` | Notification could persist if user navigated away via hardware back |
| `handleStart` fired notification when session wasn't idle | Added `sessionState !== 'idle'` guard |
| `petNameRef` dead code | Removed — was only used by `showCompletionNotification` which was deleted |
| `machineRef.current` null guard | Changed from optional chaining to explicit check in `handleStart` |
| `__DEV__` wrap on 10s test button | Hidden in production builds |

---

## 2. Feed Mechanic — Session 14

### Mochi the Fish
A separate pet lives on the Feed screen — Mochi (default name, renameable in future
settings). Mochi grows through daily feeding, independent of Pochi's focus-driven
evolution.

### FeedService (pure logic, TDD)
**15 tests** covering all behaviours:

| Function | Behaviour |
|---|---|
| `getFeedPetStage(totalFeeds)` | Returns stage 1–6 based on thresholds 0/3/10/21/50/100 |
| `getFeedPetSize(stage)` | Returns font size 36/52/68/84/100/120 — same 🐟 emoji, just bigger |
| `canFeed(lastFedTime, now?)` | True if never fed or 20+ hours have passed |
| `timeUntilNextFeed(lastFedTime, now?)` | Formats remaining cooldown as "4h", "30m", "2h 30m" |
| `feedsToNextStage(totalFeeds)` | Remaining feeds to next evolution, `null` at max |
| `feedProgressPercent(totalFeeds)` | 0–100% progress within current stage band |

### Evolution Thresholds
Front-loaded based on habit formation research (Duolingo, Finch, academic studies):

| Stage | Total Feeds | ~Day | Why |
|---|---|---|---|
| Tiny | 0 | Day 0 | Start |
| Small | 3 | Day 3 | Before 3-day churn cliff |
| Medium | 10 | Day 10 | Day 7–10 retention window |
| Big | 21 | Day 21 | "3-week habit" belief |
| Large | 50 | Day 50 | Past 30-day churn cliff |
| Giant | 100 | Day 100 | Prestige milestone |

### Feed Screen UI (`feed.tsx`)
Four states:
- **Hungry** — 3 empty dots, tap Mochi to feed
- **Feeding** — dots fill across 3 taps, bounce animation + haptic on each
- **Just completed** — "Mochi is full! 🎉", triple-buzz celebration haptic
- **On cooldown** — happy message, "Come back in Xhr"

Progress bar always visible showing feeds remaining to next growth stage.

### Haptics
- Individual taps: `notificationAsync(Warning)` — reliable on all Android devices
- Completion: triple `notificationAsync(Success)` at 0 / 180 / 360ms — dopamine hit
- Root cause of missing tap haptics: `selectionAsync` and `impactAsync` use
  `HapticFeedbackConstants` which isn't supported on all Android API levels;
  `notificationAsync` uses raw vibration patterns which always work
- `VIBRATE` permission added to `app.json` (takes effect on next dev build)

### Storage Keys Added
```
FEED_PET_NAME  — string, default "Mochi"
TOTAL_FEEDS    — number, lifetime feeds completed (drives stage computation)
LAST_FED_TIME  — number (ms timestamp), last completed feed
```

---

## Tests

| Suite | Tests |
|---|---|
| FeedService | 15 |
| recentDurations | 5 |
| NotificationService | 9 |
| FocusService | 8 |
| **Total** | **37** |

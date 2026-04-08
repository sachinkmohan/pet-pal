# Changelog

All notable changes to PetBloom are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — branch: PET-16

### Added
- **`postWarmupResumeSeconds(taskDurationSeconds, overdueMs)`** — new pure function in `TaskService.ts`; returns `max(0, taskDur - round(overdueMs/1000))`; returns **0** (not 5) when the task has fully elapsed in background, signalling an immediate completion rather than a 5-second countdown; TDD'd with 5 tests

### Fixed
- **Background-complete shows 5-second countdown + "0 min"** — when the app was backgrounded during the 2-min warm-up and reopened after both the warmup *and* the task had elapsed, `adjustSessionDuration` floored at 5s causing a 5-second timer followed by a completion modal reporting "0 min focused"; fixed by using `postWarmupResumeSeconds` (floors at 0) and, when 0 is returned, immediately transitioning the state machine (`startSession()` + `timerComplete()`) with `sessionDurationRef` set to full task minutes so the modal shows the correct duration
- **Task completion modal says "Mark it complete to earn N coins"** — coins are now awarded automatically inside `handleSaveSession` (not via the checkbox), so the teaser text was misleading; updated to **"Tap below to earn N coins 🪙"**
- **Duration badge disappears on completed tasks** — the `!task.completed` guard in the task row render was hiding the duration badge after check-off; removed the guard so the badge remains visible on completed tasks
- **Task time not added to home/stats screen** — `handleToggleComplete` never updated `FOCUS_TIME_TODAY` or `SESSIONS_TODAY`; fixed by incrementing both keys on check-off using `focusMinutesFromTask(task.durationSeconds)` (new pure helper, TDD'd with 4 tests) and `resetDailyDataIfNeeded()` before writing
- **Double-counting when session completes + task manually checked off** — `handleToggleComplete` incrementing stats + `focus.tsx` saving session data both counted the same session; fixed by auto-completing the task inside `handleSaveSession` (marks `completed: true`, adds to `POCHI_TASK_COMPLETIONS`, awards coins) so the `task.completed` guard in `handleToggleComplete` fires and prevents the second count
- **`taskId` not passed to focus screen** — `handlePlay` in `tasks.tsx` was missing `taskId: task.id` in the route params; added so `focus.tsx` can identify which task to auto-complete after "Count this time 🌟"

### Changed
- `focus.tsx` `handleSaveSession` now auto-completes the active task (updates `POCHI_TASKS`, appends to `POCHI_TASK_COMPLETIONS`, awards `calculateTaskCoins` coins) when `isTaskMode && taskId` — no separate checkbox tap needed
- `tasks.tsx` `handlePlay` passes `taskId: task.id` as a route param to `focus.tsx`
- `focus.tsx` reads `taskId` from `useLocalSearchParams`; keeps `taskIdRef` in sync for closure-safe access in `handleSaveSession`

---

## [Unreleased] — branch: PET-15

### Added
- **Optional pre-phase warm-up** — tapping play on a task now shows an action sheet: **Start now** (jumps straight into the session) or **2-min warmup** (existing behaviour)
  - `skipPrePhase` route param (`'true'`/`'false'`) passed from `tasks.tsx` to `focus.tsx`
  - `initialTaskPhase(skipPrePhase)` — pure helper in `TaskService.ts`; TDD'd with 2 tests
- **`TaskSessionContext`** type in `NotificationService.ts` — embeds `{ launchId, taskName, durationSeconds, skipPrePhase }` in the `session_running` notification data payload so `_layout.tsx` can navigate back with task params preserved
- **`resolveAutoStart(launchId, sessionLaunchId, sessionEndTime, taskDurationSeconds, now)`** — pure function in `TaskService.ts`; encapsulates the give-up vs resume vs fresh-launch decision; TDD'd with 5 tests

### Fixed
- **Give-up → restart not working** — after giving up a task session and navigating back to Tasks, tapping play again did nothing because the mount-only `useEffect([], [])` auto-start never re-fires on tab re-focus; fixed by also running the auto-start logic inside `useFocusEffect` (guarded by `machineRef.current?.getState() === 'idle'` to prevent double-start on first mount)
- **Stale phase/notification on repeated same-task launch** — replaying the same task left `taskPhase` and `prePhaseEndTimeRef` from the previous run because the reset and notification effects keyed on `taskName`, which doesn't change between launches of the same task; fixed by adding `launchId: Date.now().toString()` to every `launch()` call in `tasks.tsx` and using `launchId` as the effect dependency instead of `taskName`
- **Task timer reset to full duration on notification tap** — tapping the sticky session notification called `router.navigate('/(tabs)/focus')` without task params, clearing `isTaskMode` and triggering a full-duration restart; fixed by embedding `TaskSessionContext` in notification data and navigating with those params in `_layout.tsx`
- **Task timer not restarting after give-up + new play** — stale `launchId` captured in `useFocusEffect` closure (not in deps) caused `isSameLaunch=true` for new launches, hitting the "intentional give-up" no-op branch; fixed by introducing `launchIdRef` / `skipPrePhaseRef` (synced every render) and routing all auto-start decisions through `resolveAutoStart` via refs; `useFocusEffect` deps reduced to `[loadData]`
- **Task countdown showing stale duration after give-up** — `activeSessionDuration` was never updated in `handleStart`, so restarting from the setup view showed the previous session's duration in the task countdown; fixed by calling `setActiveSessionDuration(totalSecs)` inside `handleStart`
- **Step Away slider inheriting task duration** — `handleStart(overrideSecs)` called `setDuration(overrideSecs / 60)` unconditionally; fixed with `!isTaskMode` guard so task sessions never overwrite the user's Step Away slider value
- **`sessionLaunchIdRef` set from stale closure `launchId`** — changed to `sessionLaunchIdRef.current = launchIdRef.current` to always record the current launch identity
- **Personal best displayed as float** — `minutesToHHMM` used raw `totalMinutes % 60` which produced fractional minutes when `FOCUS_TIME_TODAY` accumulated a float; fixed by rounding to nearest integer before splitting into hours/mins

### Changed
- `TaskService.test.ts` import updated from relative path (`'../TaskService'`) to repo alias (`'@/src/services/TaskService'`) to match the shared import contract

---

## [Unreleased] — branch: PET-14

### Added
- **Tasks screen** — replaces Journey tab; position 5 (Home · Quests · Step Away · Stats · Tasks); `checklist` icon
  - Inline duration detection — typing `Review PR 10m` strips duration into a removable badge; updates live via `processTaskInput`
  - One-way check-off — tasks can be marked complete but not unchecked
  - Coin reward on check-off — auto-dismiss modal (`+N 🪙 / Task complete!`) for 1.5s; formula: `max(5, round(durationSeconds / 300))`
  - Edit / Delete — tap task row to reveal actions inline
  - Carry-over — incomplete tasks from previous days carried forward; completed tasks archived
  - Rolling 7-day stats — number row with `—` for zero days; weekly total top-right
  - Onboarding — 3-step inline guide on first use; re-accessible via `?` button
- **2-minute pre-phase** on task sessions — `CircularCountdown(120s)` with activation-energy quote before the real session
  - Sticky warm-up notification fired immediately: `"2-min warm-up started ⏱️ · Task begins at X:XX · Ends at Y:YY"`
  - AppState listener auto-transitions pre→session when app is reopened after 2+ minutes
  - Adjusted session duration: `adjustSessionDuration(durationSeconds, overdueMs)` subtracts elapsed time so countdown shows true remaining time
  - Tab bar hidden during pre-phase and active task session
- **Task completion modal** — shows task name, minutes focused, coin-earn teaser; navigates back to Tasks on dismiss
- **`TaskService.ts`** — pure logic, fully TDD'd:
  - `parseDuration`, `stripDuration`, `createTask`, `shouldCarryOver`, `filterForNewDay`, `buildRolling7Days`
  - `processTaskInput(newText, existingDuration)` — input transformation for inline duration detection
  - `calculateTaskCoins(durationSeconds)` — coin formula
  - `adjustSessionDuration(durationSeconds, overdueMs)` — overdue-aware session duration
- **`NotificationService.ts` additions** — TDD'd pure formatters:
  - `formatCheckpointBody(durationSeconds)` — checkpoint message
  - `formatPrePhaseBody(taskDurationSeconds, now)` — warm-up notification body with begin/end times
  - `showPrePhaseNotification` — sticky, tracks ID, cancelled when session starts
  - `cancelPrePhaseNotification` — dismisses sticky warm-up notification
- Storage keys: `POCHI_TASKS`, `POCHI_TASKS_LAST_DATE`, `POCHI_TASK_COMPLETIONS`, `POCHI_TASKS_ONBOARDING_DONE`
- `checklist` icon mapping added to `components/ui/icon-symbol.tsx`
- `docs/tasks-screen.md` — full design and implementation reference

### Changed
- Task sessions excluded from recents list — Step Away quick-start chips only reflect free-form sessions
- Coins now also earnable from task check-offs (in addition to quests)
- Session notification no longer dismissed on screen blur or give-up — only on natural timer completion or explicit give-up

### Fixed
- `CircularCountdown` key props (`"pre-phase"`, `"task-session"`, `"regular-session"`) — prevents React reconciling countdown instances across phase transitions, which caused the 2-min interval to run in the background after skip
- Stale closure in `handleStart` / `handleStartOpenFlow` — now reads `machineRef.current.getState()` instead of React state
- Float minutes in `FOCUS_TIME_TODAY` — `Math.round(totalSecs / 60)` in `handleStart`; `Math.round` applied in Home screen display

---

## [Unreleased] — branch: PET-12

### Added
- **Daily Quest System** — one quest per day, rotating across 5 types, resets at midnight
  - `QuestService.ts` — pure logic (27 TDD tests): `selectTodaysQuest`, `evaluateProgress`, `isQuestComplete`, `isQuestStale`, `createFreshQuestState`
  - `QuestStorage.ts` — storage wiring: `loadOrInitQuestState`, `recordQuestEvent`, `claimQuestReward`, `getCoins`
  - Quest types: `early_bird` (session before noon), `long_sit` (≥20 min session), `quality_time` (30 cumulative mins), `consistency` (2 sessions), `care_package` (feed + session)
  - `care_package` uses bit flags for order-independent tracking (bit 0 = fed, bit 1 = session)
- **Coins 🪙** — soft currency; +50 awarded per completed quest; persisted in `STORAGE_KEYS.COINS`
- **Quests tab** — new tab at position 2 (Home · Quests · Step Away · Stats · Journey); `star.fill` icon
  - Quest card with progress bar, reward badge, countdown timer until midnight reset
  - **Claim!** button when complete; green ✓ checkmark after claiming; floating coin animation on claim
  - Coin balance shown in tab header
- **Coin balance on Home screen** — 🪙 amber badge next to the streak badge; reloads on focus
- `DAILY_QUEST` and `COINS` storage keys added to `src/storage/keys.ts`
- `star.fill` → `star` icon mapping added to `components/ui/icon-symbol.tsx`
- Quest event recording hooked into focus save flow (`focus.tsx`) and feed completion (`feed.tsx`)
- `docs/quest-system.md` — full design and implementation reference
- `docs/plans-self/pochi_daily_quest_mvp.md` — original MVP design document

---

## [1.1.0] — 2026-03-xx

### Added
- **Retention strategy document** (`docs/`) — engagement mechanics and recommendations
- **Duration Picker** (`components/duration-picker.tsx`) — HH:MM snap-scroll drum picker; `nestedScrollEnabled` for use inside `ScrollView`; selection band overlay; max 5h 55m (355 min)
- **Manual duration mode** on Focus screen — `Switch` toggle replaces `CircularSlider` with `DurationPicker`; mode persisted in `STORAGE_KEYS.MANUAL_DURATION_MODE`
- **`formatDuration` utility** (`src/utils/durationPicker.ts`) — outputs `"25m"` / `"1h"` / `"1h 20m"`; applied to all stat displays
- **`durationPicker.ts` pure utilities** with 21 TDD tests: `minutesToHHMM`, `HHMMToMinutes`, `clampDuration`, `formatDuration`
- **`StatsService.ts`** — pure functions with 9 TDD tests: `buildWeekBars`, `buildDayLabels`, `findPeakIndex`
- **Stats screen** — weekly bar chart (7 days), today card, personal best highlight, weekly total and daily average
- **`StreakService.ts`** — pure `calculateStreak()` + `updateStreakAfterSession()` storage wiring; 8 TDD tests
- Recent durations cap increased 3 → 5 entries

### Fixed
- `lastStreakDate` assignment corrected to use logical OR
- Duration picker scrolling effect improved
- `versionCode` added to `app.json`; `eas.json` structure updated for production submission

### Changed
- `package.json` / `app.json` version bumped to `1.1.0`
- Music feature (rain sounds toggle) removed from Focus screen — deferred to Phase 5

---

## [1.0.0] — 2026-02-xx

### Added
- **App renamed PetPal → PetBloom** — `app.json`, `package.json`, Android package `com.petbloom.app`, `PetBloomColors` palette
- **Onboarding rebuilt as 5-step flow** — Welcome → Meet Pochi → Meet Mochi → How It Works → Notifications
  - Welcome: two floating egg animations
  - Meet Pochi / Meet Mochi: name inputs with 12-char limit, saved via `normalizePetName()`
  - How It Works: rows reference both pets by chosen names
  - Notifications: requests `expo-notifications` permission; skippable
- **Settings screen** (`app/settings.tsx`) — rename Pochi + Mochi; gear icon in Home header; save with ✓ confirmation
- **`normalizePetName` utility** (`src/utils/petName.ts`) — trim, cap 12 chars, fallback if empty; 5 TDD tests
- **First-feed hatching animation** — egg wiggles on each tap, cracks and springs into fish on 3rd tap; one-time, never replays
- **`FeedService.ts`** — 6 growth stages (Tiny → Giant) with 15 TDD tests: `getFeedPetStage`, `getFeedPetSize`, `canFeed`, `timeUntilNextFeed`, `feedsToNextStage`, `feedProgressPercent`
- **Mochi (feed pet)** — separate fish pet on Feed screen; independent of Pochi; grows through daily feeding alone
- **Feed screen** — 3-tap mechanic, 20h cooldown, particle animations (🫧), triple haptic on completion
- **Feed growth progress bar** — always visible; feeds to next stage + percentage
- **`FocusService.ts`** state machine — pure TS, `idle → active → completed`; no cheat detection
- **Honest reporting** on session complete — "Save session" vs "Don't save — I cheated"; data only written on explicit save
- **Persistent session notification** — `"25 min · Ends at 2:30 PM"`; stays in tray until user dismisses
- **`NotificationService.ts`** — `showSessionNotification`, `cancelSessionNotification`
- **Circular slider** (`components/circular-slider.tsx`) — drag-to-set duration 1–60 min; uses `react-native-svg` + `PanResponder`
- **Circular countdown** (`components/circular-countdown.tsx`) — depleting arc timer; fires `onComplete`
- **XP progress bar** (`components/xp-progress-bar.tsx`) — labelled sessions-to-evolution bar; handles legendary max
- **Evolution celebration** (`components/evolution-celebration.tsx`) — modal overlay; dismisses by writing new stage to storage
- **Evolution cards** (`components/evolution-card.tsx`) — timeline entry with connector line
- **Journey screen** — full evolution timeline; locked stages greyed, current highlighted
- **Home screen** — greeting, streak badge, pet area, mood label, daily message, XP bar, action buttons, today stats row
- **`MoodService.ts`** — `calculateMood()` real-time calculation across 5 states; `FEED_COOLDOWN_MS` exported
- **`PetStates.ts`** — `MOOD_CONFIG`, `EVOLUTION_CONFIG`, `getEvolutionStage()`, `sessionsToNextEvolution()`
- **`AppStorage.ts`** — typed `getItem` / `setItem` / `removeItem` / `clearAll` wrappers
- **`seedData.ts`** — `initializeDefaultsIfNeeded()` + `resetDailyDataIfNeeded()`
- **`STORAGE_KEYS`** const — single source of truth for all AsyncStorage keys
- **Tab bar** — Home · Step Away · Stats · Journey (4 tabs); `HapticTab` on all tabs
- **`useFocusEffect` data reload pattern** — all screens reload on focus
- Bottom tab hidden during active focus session

### Changed
- Focus tab renamed `Focus` → `Step Away`
- All session language reframed to be Pochi-centric ("Time with Pochi", "You showed up!")
- Feed taps reduced 10 → 3 (industry sweet spot for daily rituals)
- All feed haptics use `notificationAsync(Error)` (strongest available pattern)
- Recent durations shown as quick-start chips; static presets removed
- Stats display uses `formatDuration()` everywhere (no raw minute values)

### Fixed
- Home feed button was showing focus pet name instead of Mochi's name

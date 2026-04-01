# Changelog

All notable changes to PetBloom are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

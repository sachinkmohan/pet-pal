# Changelog

All notable changes to PetPal are documented here.
Format: `[Phase X · Session Y] — Description`

---

## [Unreleased]

---

## [Phase 2 · Session 6] — 2026-03-24

### Added
- `src/services/MoodService.ts` — new service with `calculateMood(input: MoodInput): MoodState` and exported `FEED_COOLDOWN_MS` constant (20 hrs)
  - All 5 mood states implemented in priority order: `thriving → happy → okay → sick → tired`
  - `thriving` requires sessions ≥ 2 + fed + screen time ok (or disabled)
  - `sick` requires `lastFedTime !== null` + 2+ days neglect + 0 sessions (null guard prevents new users starting sick)
  - `screenTimeEnabled` flag gates screen-time penalty; `screenTimeHours` defaults to 0 until `ScreenTimeService` is wired in Phase 6

### Changed
- `app/(tabs)/index.tsx` — replaced inline `deriveMood` with `calculateMood` from `MoodService`
  - `FEED_COOLDOWN_MS` now imported from `MoodService` instead of defined locally
  - Added `usageStatsEnabled` state; loaded from `STORAGE_KEYS.USAGE_STATS_ENABLED` and passed to `calculateMood`
  - Both `loadData` (for daily message pick) and render section (for live mood label) call `calculateMood`

### Fixed
- `app/_layout.tsx` — removed duplicate `} finally {` block (empty stray block introduced by linter; caused a syntax error)
- `app/(tabs)/index.tsx` — replaced HTML entities `&ldquo;`/`&rdquo;` with `\u201C`/`\u201D` template string (HTML entities render literally in React Native)

---

## [Phase 2 · Session 5] — 2026-03-24

### Added
- `app/(tabs)/index.tsx` — full Home screen layout replacing Phase 1 placeholder:
  - Time-of-day greeting + formatted date header
  - Streak badge (`🔥 N day streak`) with `PetPalColors.streak` styling
  - Pet emoji driven by `totalSessionsEver` → `getEvolutionStage()` → `EVOLUTION_CONFIG` (all 6 stages)
  - Mood label + random daily message from `MOOD_CONFIG` per current mood
  - XP progress bar showing sessions progress toward next evolution stage
  - "Start Focus Session" button → navigates to `/(tabs)/focus`
  - "Feed [Name]" button → navigates to `/feed`; white dot indicator shown when feed is available (20hr cooldown)
  - Today's stats row: Focus time (minutes) | Sessions count | Personal best
  - All data loaded in parallel via `Promise.all`; screen refreshes on focus via `useFocusEffect`
- `app/feed.tsx` — placeholder feed screen for navigation wiring (full implementation in Phase 4, Session 14)
- `src/constants/Colors.ts` — added `white: '#ffffff'` to `PetPalColors`

### Changed
- `app/_layout.tsx` — registered `feed` route in root Stack with `headerBackTitle: 'Home'`

### Fixed
- XP progress bar math: `nextStageMin` is now looked up directly from `EVOLUTION_CONFIG[nextStage].sessionsRequired` instead of being (incorrectly) derived from remaining session count, which caused the bar to always display as full

---

## [Phase 1 · Session 4] — 2026-03-23

### Added
- Floating egg animation on onboarding Welcome screen (`Animated.loop` translateY)
- Wiggling egg animation on Name step — shakes on every keystroke
- Slide-in transition between onboarding steps via `StepWrapper` (fade + spring translateX on mount)
- Staggered fade-up entrance for How It Works items (150ms apart)
- Pulsing icon animation on Permissions step
- Spring scale animation on primary button press (`onPressIn`/`onPressOut`)

### Fixed
- Root `_layout.tsx` no longer returns `null` before navigator mounts — was preventing `router.replace` from working and causing a blank screen on launch

---

## [Phase 1 · Session 3] — 2026-03-23

### Added
- `app/onboarding.tsx` — 4-step onboarding flow (Welcome → Name → How It Works → Permissions) managed with `useState`, no sub-routing
- Name input with 12-character limit and default "Pochi"
- Permissions step with Enable / Skip buttons; `USAGE_STATS_ENABLED` saved to storage
- `SplashScreen.preventAutoHideAsync()` pattern in root layout — navigates to onboarding before `hideAsync()` to prevent tab flash on first launch
- Home screen reads `petName` from AsyncStorage on mount

### Changed
- `app/_layout.tsx` — checks `ONBOARDING_COMPLETE` on mount; redirects to `/onboarding` if false
- `app/_layout.tsx` — Stack always renders immediately (navigator must be mounted before `router.replace` is called)

---

## [Phase 1 · Session 2] — 2026-03-23

### Added
- `src/storage/keys.ts` — `STORAGE_KEYS` const, single source of truth for all AsyncStorage key strings
- `src/storage/AppStorage.ts` — typed `getItem<T>`, `setItem<T>`, `removeItem`, `clearAll`, `getMultiple<T>` wrappers
- `src/storage/seedData.ts` — `initializeDefaultsIfNeeded()` (first launch defaults) and `resetDailyDataIfNeeded()` (midnight reset + streak check)
- `src/constants/PetStates.ts` — `MoodState` type, `MOOD_CONFIG`, `EvolutionStage` type, `EVOLUTION_CONFIG`, `EVOLUTION_ORDER`, helpers: `getEvolutionStage()`, `getNextEvolutionStage()`, `sessionsToNextEvolution()`
- `src/constants/Colors.ts` — `PetPalColors` flat palette (primary, accent, mood colors, streak orange, focus bar, surfaces)
- Installed `@react-native-async-storage/async-storage`

### Changed
- `app/_layout.tsx` — calls `initializeDefaultsIfNeeded()` + `resetDailyDataIfNeeded()` on app open

---

## [Phase 1 · Session 1] — 2026-03-23

### Added
- 4-tab bottom navigation: Home, Focus, Stats, Journey (via Expo Router)
- `app/(tabs)/focus.tsx` — placeholder Focus screen with circular timer UI, preset chips, music toggle
- `app/(tabs)/stats.tsx` — placeholder Stats screen with today card, weekly bar chart skeleton, screen time prompt
- `app/(tabs)/journey.tsx` — placeholder Journey screen with current stage, XP bar, full 6-stage evolution timeline
- Icon mappings for new tabs in `components/ui/icon-symbol.tsx`: `timer`, `chart.bar.fill`, `map.fill`
- `CLAUDE.md` — project guidance for future Claude Code sessions
- `PETPAL_AGENT_PROMPT.md` — developer agent prompt (TypeScript, synced with refined build plan)

### Changed
- `app/(tabs)/index.tsx` — replaced Expo starter content with PetPal Home placeholder (pet emoji, streak, buttons, stats row)
- `app/(tabs)/_layout.tsx` — replaced 2 default tabs (Home, Explore) with 4 PetPal tabs

### Removed
- `app/(tabs)/explore.tsx` — default Expo starter screen, replaced by PetPal tabs

# Changelog

All notable changes to PetPal are documented here.
Format: `[Phase X · Session Y] — Description`

---

## [Unreleased]

## [Phase 3 · Session 10] — 2026-03-24

### Added
- `components/circular-countdown.tsx` — depleting circular countdown timer:
  - Single `setInterval` on mount (empty dep array); functional `setRemaining` update avoids stale state
  - `onCompleteRef` keeps the `onComplete` callback fresh without restarting the interval
  - Full-circle arc uses two half-arcs to avoid degenerate SVG path at 360°
  - `formatTime` zero-pads MM:SS with `fontVariant: ['tabular-nums']` for stable layout
  - Matches `CircularSlider` geometry (SIZE=240, TRACK_RADIUS=96, STROKE_WIDTH=16)
  - Props: `totalSeconds: number`, `onComplete: () => void`

### Changed
- `app/(tabs)/focus.tsx` — wired full setup → active session → completion flow:
  - Added `sessionActive`, `sessionComplete`, `completedDuration` states
  - Start button transitions to active session view: `CircularCountdown` + pet encouragement hint + Give Up button
  - Give Up button calls `handleGiveUp` → clears `sessionActive`, returns to setup
  - `handleSessionComplete` persists session on completion: calls `resetDailyDataIfNeeded()`, increments and persists `TOTAL_SESSIONS_EVER` / `SESSIONS_TODAY` / `FOCUS_TIME_TODAY`, calls `calculateMood()` with fresh values, refreshes pet emoji in case an evolution threshold was crossed
  - Completion modal: dark-mode aware card, `PetPalColors.scrim` backdrop, pet emoji + duration summary + "Awesome!" dismiss button
  - `useFocusEffect` cleanup cancels active session on blur (not on next focus) — `CircularCountdown` cannot continue offscreen or fire `handleSessionComplete` after navigation
  - `sessionComplete` is NOT reset by `useFocusEffect` — modal persists until explicitly dismissed

---

## [Phase 3 · Session 9] — 2026-03-24

### Added

- `components/circular-slider.tsx` — interactive circular duration picker (1–60 min):
  - Fixed SIZE=240, TRACK_RADIUS=96; SVG arc from 12-o'clock via `react-native-svg`
  - `PanResponder` gesture handling (grant + move) with `touchToValue` converting raw touch coords to 1–60 range
  - Active arc rendered with `strokeLinecap="round"`; thumb as two concentric `Circle` elements (primary outer, white inner dot)
  - Duration + "min" label as absolute overlay with `pointerEvents="none"`
  - Dark-mode aware track color via `useColorScheme()`
- `react-native-svg@15.12.1` — installed for SVG arc rendering in circular slider

### Changed

- `app/(tabs)/focus.tsx` — full rebuild replacing placeholder:
  - Reads `petName` + `totalSessionsEver` from storage on focus; derives `petEmoji` via `getEvolutionStage` → `EVOLUTION_CONFIG`
  - `<CircularSlider value={duration} onChange={setDuration} />` wired with `useState(25)` default
  - Preset chips (5 / 15 / 30 / 60) as `Pressable`; active chip highlighted with `PetPalColors.primary` background
  - Pet emoji preview with `"[Name] is ready to focus!"` caption
  - Music toggle (Rain sounds) — state-only (`musicEnabled`); playback wired in Phase 5
  - Start button (`Pressable`) — navigation/timer logic stubbed for Session 10

---

### Fixed

- `app/(tabs)/index.tsx` — evolution celebration now only fires when stage advances **forward**: replaced `storedStage !== computedStage` check with index comparison (`computedIndex > storedIndex` in `EVOLUTION_ORDER`), preventing spurious celebrations if stored stage is corrupt or higher than computed
- `components/evolution-celebration.tsx` — secondary UI elements now use dark-mode tokens when theme is dark: `rewardText` uses `textMutedDark`, share card background uses `surfaceDark`, share button background uses `surfaceDark` (previously all three used light-only tokens regardless of theme)

## [Phase 2 · Session 8] — 2026-03-24

### Added

- `components/evolution-celebration.tsx` — modal overlay shown when pet evolves:
  - Spring scale + opacity entrance animation via `Animated` API
  - Confetti emoji strip, large pet emoji, stage name, unlock reward text
  - Shareable card with generated text: `"[Name] just evolved into [Stage]! 🎉 \n[N] focus sessions completed."`
  - Share button (uses RN `Share.share()`; failure silently ignored — card text visible)
  - Dismiss button writes confirmed stage to storage, preventing retrigger
  - Dark-mode aware card background via `useColorScheme()`
- `src/constants/Colors.ts` — added `scrim: 'rgba(0,0,0,0.6)'` token for modal backdrops

### Changed

- `app/(tabs)/index.tsx` — wires evolution detection and celebration:
  - Loads `STORAGE_KEYS.EVOLUTION_STAGE` in `loadData` alongside other data
  - Validates stored stage against `EVOLUTION_ORDER` before comparing (prevents infinite retrigger on corrupt/unknown value)
  - Sets `celebrationStage` state when computed stage differs from stored stage
  - `handleEvolutionDismiss` writes new stage to storage (with try/catch) then clears state
  - `EvolutionCelebration` conditionally mounted (not just hidden) — fresh animation on every evolution

---

## [Phase 2 · Session 7] — 2026-03-24

### Added

- `components/xp-progress-bar.tsx` — reusable `XpProgressBar` component; handles 0%, mid-progress, full, and legendary (max) states; shows sessions-left label
- `components/evolution-card.tsx` — reusable `EvolutionCard` component for timeline entries; renders `completed` (green checkmark), `current` (highlighted row + pill badge + primary border), and `locked` (dimmed at 35% opacity) statuses; optional connector line between cards
- `app/(tabs)/journey.tsx` — full rebuild replacing hardcoded placeholder:
  - Reads `petName` + `totalSessionsEver` from storage; refreshes on focus via `useFocusEffect`
  - Current stage card: pet emoji, name + stage label, total sessions count, `XpProgressBar`
  - Next evolution preview section (hidden at legendary): current emoji → next emoji with unlock reward
  - Full 6-stage evolution timeline using `EvolutionCard`; status derived dynamically from `totalSessionsEver`

### Changed

- `app/(tabs)/index.tsx` — replaced inline XP bar JSX + calculations with `<XpProgressBar>` component; removed `getNextEvolutionStage` and `sessionsToNextEvolution` imports; removed dead XP styles (`xpSection`, `xpLabelRow`, `xpLabel`, `xpSubLabel`, `xpBarBg`, `xpBarFill`)

### Fixed

- `components/evolution-card.tsx` — `egg` detail line was rendering `"Starting state · Starting state"` (duplicate); now shows only `"Starting state"` for the starting stage
- `components/xp-progress-bar.tsx` — added `?? 0` null guard on `sessionsLeft` render (TypeScript type is `number | null`; value is never actually null at that render point but guard is correct)

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

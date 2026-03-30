# Changelog

All notable changes to PetBloom are documented here.
Format: `[Phase X · Session Y] — Description`

---

## [Unreleased]

### App renamed: PetPal → PetBloom

#### Changed

- `app.json` — `name`/`slug` → `PetBloom`; `scheme` → `petbloom`; `package` → `com.petbloom.app`
- `package.json` — `name` → `petbloom`
- `src/constants/Colors.ts` — export renamed `PetPalColors` → `PetBloomColors`; updated in all 12 consumer files (`app/`, `components/`)
- `components/evolution-celebration.tsx` — share text hashtag `#PetPal` → `#PetBloom`
- All docs (`CLAUDE.md`, `CHANGELOG.md`, `README.md`, `docs/notifications.md`, `docs/feed-pet-design.md`) — text references updated

#### Fixed

- `app/(tabs)/index.tsx` — feed button on Home screen now shows the fish's name (reads `STORAGE_KEYS.FEED_PET_NAME`) instead of incorrectly showing the focus pet's name; `fishName` state added and loaded in `loadData` alongside other storage reads

---

### Phase 4 · Session 16–17 — Onboarding Overhaul, Settings & UX Reframe

#### Added

- `src/utils/petName.ts` — `normalizePetName(input, fallback)` pure utility: trims whitespace, caps at 12 chars, falls back to default if empty; 5 tests in `src/utils/__tests__/petName.test.ts`
- `app/settings.tsx` — Settings screen accessible from gear icon on Home header:
  - Two editable name fields: focus buddy (Pochi) + daily fish (Mochi)
  - Saves to `STORAGE_KEYS.PET_NAME` and `STORAGE_KEYS.FEED_PET_NAME` on confirm
  - Save button turns green with ✓ confirmation; names reload on screen focus
- `app/_layout.tsx` — registered `settings` route in root Stack
- `components/ui/icon-symbol.tsx` — added `gearshape.fill` → `settings` (MaterialIcons) mapping

#### Changed

- `app/onboarding.tsx` — full 5-step overhaul (was 4 steps: Welcome → Name → How It Works → Permissions):
  - **Welcome** — two floating eggs with staggered animation (`translateY` loop offset by 500ms); copy: "Meet your new friends!"
  - **Meet Pochi** — wiggling egg + Pochi description ("Put your phone down and I'll grow") + name input; rename hint above CTA: "You can rename them anytime in Settings"
  - **Meet Mochi** — wiggling egg + Mochi description ("Feed me once a day and I'll grow") + name input; same rename hint
  - **How It Works** — updated rows: `🐾 Spend time with [Pochi]` / `🐟 Feed [Mochi] daily` / `✨ Watch both grow`; now uses chosen pet names
  - **Notifications** — replaces Permissions step; requests `expo-notifications` permission via `requestPermissionsAsync()`; copy: "Don't let us starve!"; skip completes onboarding either way
  - Both `finishOnboarding` writes: `PET_NAME`, `FEED_PET_NAME` (via `normalizePetName`), `ONBOARDING_COMPLETE`
  - Rename hint placed outside `center` flex block (in `bottomGroup` with button) so it stays visible when keyboard is open
- `app/feed.tsx` — first-feed hatching animation (one-time, never replays):
  - Before first feed: shows `🥚` egg with heading "Tap to hatch [name]!"
  - Each of 3 taps: egg rotates ±18° wiggle via `eggShakeAnim`
  - On third tap (first feed complete): shake sequence → egg scales up + fades out → fish springs in with bounce overshoot; heading changes to "Meet [name]! 🐟"
  - Egg and fish both `position: 'absolute'` in a fixed 160×160 `petContainer` — prevents vertical stacking artefact during simultaneous render
  - `hatchAnim` and `eggShakeAnim` reset in `loadData` on screen re-focus
- `app/(tabs)/index.tsx` — gear icon (top-right header) navigates to `/settings`; Home CTA copy updated (see UX reframe below)

#### UX Reframe: "Focus Session" → Pochi-centric language

All "focus" framing replaced with phone-down / Pochi-centric copy:

| Location | Before | After |
|---|---|---|
| Tab label | `Focus` | `Step Away` |
| Setup screen title | `Focus Session` | `Time with [name]` |
| Pet caption | `[name] is ready to focus!` | `[name] is waiting for you` |
| Active session title | `Stay focused!` | `You're with [name] ☁️` |
| Active session hint | `[name] is cheering you on` | `Phone down. [name] needs you.` |
| Give up | `Give up` | `Go back to my phone` |
| Completion heading | `Session complete!` | `You showed up! 🎉` |
| Completion body | `You focused for X mins. [name] is so proud!` | `X minutes with [name]. [name] loved every minute.` |
| Save button | `Save session 🌟` | `Count this time 🌟` |
| Cheat button | `Don't save — I cheated` | `Don't save — I looked at my phone` |
| Home CTA | `🎯 Start Focus Session` | `🐾 Time with [name]` |
| Home stat | `Focus today` | `Away time` |
| Home stat | `Sessions` | `Visits` |
| Stats screen | `Focus time` | `Away time` |

---

### Phase 4 · Sessions 14–15 (partial) — Feed Mechanic

#### Added

- `src/services/FeedService.ts` — pure TypeScript service (15 tests) with 6 functions:
  - `getFeedPetStage(totalFeeds)` — maps lifetime feeds to 6 growth stages (Tiny/Small/Medium/Big/Large/Giant) at thresholds 0/3/10/21/50/100 (front-loaded, based on habit-formation research)
  - `getFeedPetSize(stage)` — returns font size 36/52/68/84/100/120; same 🐟 emoji scales visually with stage
  - `canFeed(lastFedTime, now?)` — true if never fed or ≥20 hours have elapsed
  - `timeUntilNextFeed(lastFedTime, now?)` — formats remaining cooldown as "4h", "30m", "2h 30m"
  - `feedsToNextStage(totalFeeds)` — feeds remaining until next growth stage; `null` at max
  - `feedProgressPercent(totalFeeds)` — 0–100% progress within current stage band
- `app/feed.tsx` — full Feed screen with 4 UI states:
  - **Hungry** — 3 empty dots, tap Mochi to feed (3 taps — reduced from 10 after UX research; 2–4 taps is the industry sweet spot for daily rituals)
  - **Feeding** — dots fill on each tap; scale bounce animation + `notificationAsync(Warning)` haptic per tap
  - **Just completed** — "Mochi is full! 🎉"; triple `notificationAsync(Success)` at 0/180/360ms
  - **On cooldown** — happy message + "Come back in Xhr"
  - Growth progress bar always visible showing feeds to next stage + percentage
  - Food particle animation on each tap: 4 🫧 bubble particles per tap, randomised x-offset (±40px) and duration (600–800ms), float up and fade via `Animated.parallel`, self-clean from state
  - Mochi is a separate fish pet (independent of Pochi) — grows through daily feeding alone
- `STORAGE_KEYS.FEED_PET_NAME`, `STORAGE_KEYS.TOTAL_FEEDS`, `STORAGE_KEYS.LAST_FED_TIME` — new keys in `src/storage/keys.ts`
- `app.json` — added `VIBRATE` permission (required for `notificationAsync` on Android; takes effect on next dev build)

#### Note on haptics
`notificationAsync` is used for both tap and completion feedback instead of `selectionAsync`/`impactAsync` — the latter rely on `HapticFeedbackConstants` which isn't supported on all Android API levels; `notificationAsync` uses raw vibration patterns which always work.

---

## [Phase 3 · Session 11] — 2026-03-30

### Added

- `src/services/FocusService.ts` — pure TypeScript state machine (no React Native deps); 10 tests:
  - States: `idle → active → completed`
  - `startSession()`, `timerComplete()`, `giveUp()`, `dispose()`
  - Grace period handling removed — screen lock triggers `background` indistinguishably from app-switching; enforcing it caused false failures. Replaced with honest-reporting flow: user chooses "Save session" or "Don't save — I cheated" after timer completes
- `components/grace-overlay.tsx` — 10-second countdown overlay (retained for future use); uses `onExpiredRef` to prevent stale closure; fires `onExpired` callback at zero
- `src/services/NotificationService.ts` — session notification service; 9 tests:
  - `showSessionNotification(petName, durationSeconds)` — requests permission, shows persistent notification: title `"[petName] is waiting... 🐣"`, body `"Session ends at 3:45 PM — stay focused!"` (end time calculated from duration, 12hr format)
  - `cancelSessionNotification()` — dismisses notification; called on complete, give-up, and failure dismiss
  - `formatEndTime(durationSeconds, now?)` — pure injectable helper
  - Completion notification deliberately removed — end time in start notification is sufficient; eliminates Android Doze mode scheduling delay entirely
- `src/storage/recentDurations.ts` — `addRecentDuration(existing, duration)` pure function; deduplicates and caps at 3 entries; 5 tests
- `STORAGE_KEYS.RECENT_DURATIONS` — stores `number[]` of last 3 unique saved session durations
- `eas.json` — EAS build profiles: `development` (dev client APK), `preview` (APK for internal distribution), `production` (AAB for Play Store)
- `docs/notifications.md` — notification behaviour documentation
- `docs/background-timer-investigation.md` — writeup of `react-native-background-actions` investigation and why it was dropped for MVP

### Changed

- `app/(tabs)/focus.tsx` — major overhaul:
  - Wired `FocusService` state machine; `machineRef` created once in `useEffect([], [])`, disposed on unmount
  - Tab bar hidden during active session via `navigation.setOptions`
  - Static preset chips (5/15/30/60 min) replaced with last 3 unique saved session durations; chips hidden on fresh install; "RECENT" label appears once sessions exist; tapping a chip starts the session immediately
  - `handleStart` guarded with `sessionState !== 'idle'` check to prevent double-fire
  - `cancelSessionNotification()` added to blur cleanup — prevents notification persisting if user navigates away via hardware back
  - `petNameRef` dead code removed (was only used by the removed completion notification)
  - 10-second test button wrapped in `__DEV__` — hidden in production builds
- `app.json` — added `expo-notifications` plugin, `POST_NOTIFICATIONS` permission, EAS project ID
- `package.json` — added `expo-notifications`, `expo-dev-client`
- `@types/jest` — corrected from `^30.0.0` to `^29.5.0` to match `jest@^29.7.0`

---

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
  - Completion modal: dark-mode aware card, `PetBloomColors.scrim` backdrop, pet emoji + duration summary + "Awesome!" dismiss button
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
  - Preset chips (5 / 15 / 30 / 60) as `Pressable`; active chip highlighted with `PetBloomColors.primary` background
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
  - Streak badge (`🔥 N day streak`) with `PetBloomColors.streak` styling
  - Pet emoji driven by `totalSessionsEver` → `getEvolutionStage()` → `EVOLUTION_CONFIG` (all 6 stages)
  - Mood label + random daily message from `MOOD_CONFIG` per current mood
  - XP progress bar showing sessions progress toward next evolution stage
  - "Start Focus Session" button → navigates to `/(tabs)/focus`
  - "Feed [Name]" button → navigates to `/feed`; white dot indicator shown when feed is available (20hr cooldown)
  - Today's stats row: Focus time (minutes) | Sessions count | Personal best
  - All data loaded in parallel via `Promise.all`; screen refreshes on focus via `useFocusEffect`
- `app/feed.tsx` — placeholder feed screen for navigation wiring (full implementation in Phase 4, Session 14)
- `src/constants/Colors.ts` — added `white: '#ffffff'` to `PetBloomColors`

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
- `src/constants/Colors.ts` — `PetBloomColors` flat palette (primary, accent, mood colors, streak orange, focus bar, surfaces)
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

- `app/(tabs)/index.tsx` — replaced Expo starter content with PetBloom Home placeholder (pet emoji, streak, buttons, stats row)
- `app/(tabs)/_layout.tsx` — replaced 2 default tabs (Home, Explore) with 4 PetBloom tabs

### Removed

- `app/(tabs)/explore.tsx` — default Expo starter screen, replaced by PetBloom tabs

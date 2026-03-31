# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (choose Android/iOS/Web from menu)
npx expo start

# Start directly on Android emulator
npx expo start --android

# Type-check (no emit)
npx tsc --noEmit

# Lint
npx expo lint

# Build for Android (requires EAS CLI)
eas build --platform android
```

> Native modules (`react-native-background-actions`, `react-native-track-player`) require a **dev build** — Expo Go will not work. Run `npx expo install expo-dev-client` then `eas build --profile development`.

## Architecture

### Routing — Expo Router (file-based)

```
app/
  _layout.tsx          # Root Stack: checks onboarding on mount, controls SplashScreen
  onboarding.tsx       # Multi-step onboarding (5 steps via useState, no sub-routing)
                       # Steps: welcome → meet-pochi → meet-mochi → how-it-works → notifications
  feed.tsx             # Feed screen; pushed from Home button
  settings.tsx         # Settings screen (pet renaming); pushed from Home header gear icon
  (tabs)/
    _layout.tsx        # Bottom tab navigator (Home / Step Away / Stats / Journey)
    index.tsx          # Home screen (gear icon → /settings)
    focus.tsx          # "Step Away" screen (formerly Focus)
    stats.tsx          # Stats screen
    journey.tsx        # Pet evolution timeline
  modal.tsx
```

**Initial route flow:** `_layout.tsx` renders the Stack immediately (navigator must be mounted before `router.replace` is called), keeps the splash screen visible via `SplashScreen.preventAutoHideAsync()`, checks `ONBOARDING_COMPLETE` in AsyncStorage, then calls `router.replace('/onboarding')` if needed — all before `SplashScreen.hideAsync()` fires. This prevents any tab flash on first launch.

### Data layer — `src/`

```
src/
  storage/
    keys.ts          # STORAGE_KEYS const — all AsyncStorage key strings, single source of truth
    AppStorage.ts    # Typed get/set/remove/clear wrappers around AsyncStorage
    seedData.ts      # initializeDefaultsIfNeeded() + resetDailyDataIfNeeded() (called in root layout)
  constants/
    PetStates.ts     # MoodState type, MOOD_CONFIG, EvolutionStage type, EVOLUTION_CONFIG,
                     # helpers: getEvolutionStage(), getNextEvolutionStage(), sessionsToNextEvolution()
    Colors.ts        # PetBloomColors palette (primary, accent, mood colors, etc.)
  services/
    MoodService.ts          # calculateMood(MoodInput): MoodState — all 5 states, real-time calculation
                            # also exports FEED_COOLDOWN_MS (20 hrs); import from here, never redefine
    FocusService.ts         # Pure TS state machine: idle → active → completed
                            # startSession(), timerComplete(), giveUp(), dispose()
                            # No grace period — replaced by honest-reporting ("Save" / "Don't save — I cheated")
    NotificationService.ts  # showSessionNotification(petName, durationSeconds) + cancelSessionNotification()
                            # Shows persistent "Session ends at X:XX PM" notification on session start
                            # No completion notification — end time in start notification is sufficient
    FeedService.ts          # Pure TS feed logic (no RN deps): getFeedPetStage, getFeedPetSize,
                            # canFeed, timeUntilNextFeed, feedsToNextStage, feedProgressPercent
    StreakService.ts        # calculateStreak(StreakInput): StreakResult — pure, no storage deps
                            # updateStreakAfterSession() — storage wiring; call after saveSessionData
                            # Qualifies when sessionsToday ≥ 1 AND fed within 24h; idempotent same day
    StatsService.ts         # buildWeekBars(weeklyData, focusTimeToday) → number[7]
                            # buildDayLabels(now) → string[7] ending with 'Today'
                            # findPeakIndex(bars) → index of tallest bar, -1 if all zero
  storage/
    recentDurations.ts      # addRecentDuration(existing, duration) — deduplicates, caps at 5
                            # Used by Step Away screen quick-start chips
  utils/
    petName.ts              # normalizePetName(input, fallback) — trim, cap 12 chars, fallback if empty
                            # Used by onboarding + settings to validate pet names before saving
    durationPicker.ts       # minutesToHHMM, HHMMToMinutes, clampDuration(1–355), formatDuration
                            # formatDuration: "25m" | "1h" | "1h 20m" — use for all stat displays
```

Everything persisted uses `STORAGE_KEYS` — never use raw strings. All storage access goes through `AppStorage.ts` helpers which handle `JSON.parse/stringify` automatically.

### Path aliases

`@/*` maps to the repo root. Use `@/src/...`, `@/components/...`, `@/constants/...`, `@/hooks/...`.

### PetBloom components — `components/`

Domain components built so far (use these rather than re-implementing inline):

- `xp-progress-bar.tsx` — `<XpProgressBar totalSessionsEver={n} currentStage={stage} />` — renders labelled XP bar; handles legendary max state automatically
- `evolution-card.tsx` — `<EvolutionCard stage={stage} status={'completed'|'current'|'locked'} showConnector? />` — single timeline entry with connector line support
- `evolution-celebration.tsx` — `<EvolutionCelebration visible petName={s} newStage={stage} totalSessions={n} onDismiss={fn} />` — modal overlay; conditionally mount (don't pass `visible=false`); dismiss handler must write new stage to `STORAGE_KEYS.EVOLUTION_STAGE` to prevent retrigger
- `circular-slider.tsx` — `<CircularSlider value={n} onChange={fn} />` — circular drag picker for focus duration (1–60 min); uses `react-native-svg` + `PanResponder`; self-contained (SIZE=240); renders SVG arc + thumb + duration label overlay
- `circular-countdown.tsx` — `<CircularCountdown totalSeconds={n} onComplete={fn} />` — depleting arc countdown timer; single interval on mount; `onCompleteRef` prevents stale closure; full-circle path uses two half-arcs; same geometry as `CircularSlider`
- `grace-overlay.tsx` — 10-second countdown overlay (retained, not currently active); `onExpiredRef` prevents stale closure; fires `onExpired` at zero
- `duration-picker.tsx` — `<DurationPicker value={minutes} onChange={fn} />` — two snap-scroll columns (H: 0–5, M: 0–59); `nestedScrollEnabled` for use inside outer ScrollView; selection band overlay with primary-colour border

### Theming

- `constants/theme.ts` — `Colors` (light/dark tab tints) + `Fonts` (platform-specific font stacks). Used by existing components (`ThemedText`, `ThemedView`, tab layout).
- `src/constants/Colors.ts` — `PetBloomColors` flat palette for new screens (mood colors, streak orange, focus bar blue, etc.).
- `hooks/use-color-scheme.ts` — wraps `useColorScheme` for light/dark detection.
- `components/themed-text.tsx` / `components/themed-view.tsx` — use these for text and container views in new screens.

### Icons

`components/ui/icon-symbol.tsx` maps SF Symbol names → Material Icons for Android/web. Add new mappings there before using a new icon name in a tab or screen.

### Key domain rules (from build plan)

- **Streak:** Both fed + ≥1 focus session required on the same day. Updated in real-time via `updateStreakAfterSession()` after every save (also checked at midnight via `resetDailyDataIfNeeded()`). Pure logic lives in `StreakService.ts`.
- **Feed cooldown:** 20 hours (not 24) — intentional habit-formation design.
- **Feed taps:** 3 taps to complete a feed (reduced from 10 after UX research — 2–4 taps is the industry sweet spot for daily rituals).
- **Feed pet (Mochi):** Separate fish pet on the Feed screen, independent of Pochi. Grows through daily feeding alone via `FeedService` stage thresholds (0/3/10/21/50/100 feeds).
- **Mood:** Calculated in real-time via `calculateMood()` in `src/services/MoodService.ts`. Call after every session completion and every feed. Pass `screenTimeHours` once `ScreenTimeService` is wired (Phase 6).
- **Evolution:** Driven by `totalSessionsEver` (never resets). Thresholds: 0/10/25/50/100/200 sessions.
- **Focus session honesty:** No cheat detection. On session complete, user chooses "Save session" or "Don't save — I cheated". Data only written on explicit save.
- **Session notification:** Body format: `"25 min · Ends at 2:30 PM"`. Persists in tray after session completes (user dismisses manually). Cancelled only on give-up or screen blur.
- **Recent durations:** Last 5 unique saved session durations in `STORAGE_KEYS.RECENT_DURATIONS`. Shown as quick-start chips on Focus screen; hidden on fresh install.
- **Duration picker:** Focus screen has a `Manual` toggle switch (`STORAGE_KEYS.MANUAL_DURATION_MODE`). When ON, replaces `CircularSlider` with `DurationPicker` (HH:MM snap-scroll). Toggle state persisted — restored on app reopen. Max duration: 5h 55m (355 min).
- **Duration formatting:** Always use `formatDuration(minutes)` from `src/utils/durationPicker.ts` for displaying stat values. Output: `"25m"` / `"1h"` / `"1h 20m"`.
- **Screen time:** Optional — app fully functional without `USAGE_STATS_ENABLED`. Never penalise mood if disabled.
- **Pet never dies** — only reaches `sick` state. Always recoverable.

### Screen data refresh pattern

Use `useFocusEffect` from `expo-router` to reload storage data whenever a screen gains focus. This ensures the Home screen reflects changes made on other screens (Feed, Focus) when the user returns.

```typescript
// Correct pattern — useFocusEffect requires a stable (non-async) callback
useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
```

Note: this is one of the few places `useCallback` is load-bearing — `useFocusEffect` requires a stable reference to avoid re-registering on every render. The React Compiler rule still applies everywhere else.

### React Compiler

`reactCompiler: true` is enabled in `app.json`. Avoid manual `useMemo`/`useCallback` — the compiler handles memoization. Do not fight the compiler with manual dependency arrays it would override.

### Animations

Use React Native's built-in `Animated` API (not Reanimated) for onboarding and simple UI animations. `react-native-reanimated` is available for complex gesture-driven animations in later phases.

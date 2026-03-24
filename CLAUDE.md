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
  onboarding.tsx       # Multi-step onboarding (4 steps via useState, no sub-routing)
  feed.tsx             # Feed screen (placeholder → full impl in Phase 4); pushed from Home button
  (tabs)/
    _layout.tsx        # Bottom tab navigator (Home / Focus / Stats / Journey)
    index.tsx          # Home screen
    focus.tsx          # Focus session screen
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
    Colors.ts        # PetPalColors palette (primary, accent, mood colors, etc.)
  services/
    MoodService.ts   # calculateMood(MoodInput): MoodState — all 5 states, real-time calculation
                     # also exports FEED_COOLDOWN_MS (20 hrs); import from here, never redefine
```

Everything persisted uses `STORAGE_KEYS` — never use raw strings. All storage access goes through `AppStorage.ts` helpers which handle `JSON.parse/stringify` automatically.

### Path aliases

`@/*` maps to the repo root. Use `@/src/...`, `@/components/...`, `@/constants/...`, `@/hooks/...`.

### Theming

- `constants/theme.ts` — `Colors` (light/dark tab tints) + `Fonts` (platform-specific font stacks). Used by existing components (`ThemedText`, `ThemedView`, tab layout).
- `src/constants/Colors.ts` — `PetPalColors` flat palette for new screens (mood colors, streak orange, focus bar blue, etc.).
- `hooks/use-color-scheme.ts` — wraps `useColorScheme` for light/dark detection.
- `components/themed-text.tsx` / `components/themed-view.tsx` — use these for text and container views in new screens.

### Icons

`components/ui/icon-symbol.tsx` maps SF Symbol names → Material Icons for Android/web. Add new mappings there before using a new icon name in a tab or screen.

### Key domain rules (from build plan)

- **Streak:** Both fed + ≥1 focus session required on the same day. Checked at midnight via `resetDailyDataIfNeeded()`.
- **Feed cooldown:** 20 hours (not 24) — intentional habit-formation design.
- **Mood:** Calculated in real-time via `calculateMood()` in `src/services/MoodService.ts`. Call after every session completion and every feed. Pass `screenTimeHours` once `ScreenTimeService` is wired (Phase 6).
- **Evolution:** Driven by `totalSessionsEver` (never resets). Thresholds: 0/10/25/50/100/200 sessions.
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

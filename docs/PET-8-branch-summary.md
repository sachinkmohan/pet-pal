# PET-8 Branch Summary — Cheat Detection, Background & Notifications

Branch: `PET-8` | Base: `main`

---

## What Was Built

### 1. Focus Session State Machine (`src/services/FocusService.ts`)

A pure TypeScript state machine (no React Native deps) that drives the focus session lifecycle.

**States:** `idle → active → grace → completed | failed`

- `startSession()` — transitions `idle → active`
- `onBackground()` — when app goes to background during `active`, starts a 10-second grace period (`active → grace`)
- `onForeground()` — if user returns within 10s wall-clock time, resumes (`grace → active`); otherwise transitions to `failed`
- `timerComplete()` — marks session as `completed`
- `giveUp()` — returns to `idle` from any state
- `dispose()` — clears internal timers on unmount

Wall-clock timestamps are used (not JS timers) so grace enforcement works correctly even in Expo Go where JS timers are throttled in the background.

**Tests:** 10 tests covering all state transitions (`src/services/__tests__/FocusService.test.ts`)

---

### 2. Grace Period Overlay (`components/grace-overlay.tsx`)

An absolutely-positioned overlay shown when the session is in the `grace` state (user left the app).

- Displays a 10-second countdown in red
- Uses `onExpiredRef` pattern to prevent stale closure issues
- Fires `onExpired` callback when countdown reaches 0 (routes through the state machine via `giveUp()`)

---

### 3. Focus Screen Overhaul (`app/(tabs)/focus.tsx`)

Major update to wire the state machine into the UI:

- **Tab bar hidden** during active session and failure modal (`navigation.setOptions`)
- **Grace overlay** rendered over the active session view (CircularCountdown stays mounted during grace so timer doesn't reset)
- **Failure modal** shown when session state is `failed` — "💔 Session ended / You left and [name] got lonely / Try again"
- **AppState listener** — calls `machine.onBackground()` / `machine.onForeground()` on app state changes
- **Machine created once** in `useEffect([], [])` and disposed on unmount
- `handleSessionCompleteRef` pattern prevents stale closures in the completion handler
- Replaced `BackgroundTimerService` with `NotificationService` for session start/end

---

### 4. Notification Service (`src/services/NotificationService.ts`)

Uses `expo-notifications` to show a persistent notification when a focus session starts.

- `showSessionNotification(petName, durationSeconds)` — requests permission, schedules an immediate persistent notification
  - Title: `"[petName] is waiting... 🐣"`
  - Body: `"Session ends at 3:45 PM — stay focused!"` (end time calculated from duration)
- `cancelSessionNotification()` — dismisses the notification; called on session complete, give up, and failure dismiss
- `formatEndTime(durationSeconds, now?)` — pure injectable helper, 12-hour format with AM/PM

**Tests:** 8 tests (`src/services/__tests__/NotificationService.test.ts`)

---

### 5. EAS Build Setup (`eas.json`)

Added EAS build configuration with three profiles:
- `development` — dev client APK for local testing with native modules
- `preview` — APK for internal distribution
- `production` — AAB for Play Store

---

### 6. Dependency & Config Changes

- Added `expo-notifications`, `expo-dev-client` to `package.json`
- `app.json`: added `expo-notifications` plugin, set `POST_NOTIFICATIONS` permission, EAS project ID

---

## What Was Investigated and Dropped

### `react-native-background-actions` (live countdown in notification)

Attempted to show a live "14:32 remaining" countdown in the Android notification using a JS foreground service. Hit `MissingForegroundServiceTypeException` on Android 14+ (targetSDK 34 requires every foreground service to declare `android:foregroundServiceType` in the manifest). Two full EAS cloud build cycles spent on config plugin fixes — still crashing.

**Decision:** Dropped for MVP. Static end-time notification ("Session ends at 3:45 PM") is sufficient and works without any background service. See `docs/background-timer-investigation.md` for full details.

Artefacts from this investigation (`BackgroundTimerService.ts`, `withForegroundServiceType.js`, related tests and permissions) were cleaned up before merging.

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/FocusService.ts` | New — state machine |
| `src/services/__tests__/FocusService.test.ts` | New — 10 tests |
| `src/services/NotificationService.ts` | New — session notifications |
| `src/services/__tests__/NotificationService.test.ts` | New — 8 tests |
| `components/grace-overlay.tsx` | New — grace period UI |
| `app/(tabs)/focus.tsx` | Updated — wired state machine, notifications, tab hide |
| `app.json` | Updated — permissions, plugins, EAS project ID |
| `eas.json` | New — build profiles |
| `docs/notifications.md` | New — notification behaviour docs |
| `docs/background-timer-investigation.md` | New — investigation writeup |
| `package.json` | Updated — added expo-notifications, expo-dev-client |

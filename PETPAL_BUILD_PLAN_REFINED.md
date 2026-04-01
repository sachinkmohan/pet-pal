# 🐣 PetPal — Refined Build Plan

> A focus & wellness app where your virtual pet Pochi grows based on your screen habits and focus sessions.

---

## 📋 Table of Contents

1. [Decisions Log](#decisions-log)
2. [App Concept](#app-concept)
3. [Core Features (MVP)](#core-features-mvp)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Onboarding Flow](#onboarding-flow)
7. [Screen Breakdown](#screen-breakdown)
8. [Pet Mood System](#pet-mood-system)
9. [Pet Evolution System](#pet-evolution-system)
10. [Focus Session Logic](#focus-session-logic)
11. [Tap to Feed Mechanic](#tap-to-feed-mechanic)
12. [Streak System](#streak-system)
13. [Stats System](#stats-system)
14. [Music System](#music-system)
15. [Notifications](#notifications)
16. [Monetization Plan](#monetization-plan)
17. [MVP Build Phases](#mvp-build-phases)
18. [Libraries Reference](#libraries-reference)
19. [What's Deferred to v2](#whats-deferred-to-v2)

---

## 📝 Decisions Log

Changes from the original plan, with rationale:

| Decision | Original | Refined | Why |
|---|---|---|---|
| Proximity sensor | Included in MVP | **Cut entirely** | Unreliable across Android devices; false positives would kill sessions unfairly |
| Cheat detection | Instant session kill | **10-second grace period** | Handles phone calls, accidental taps, notification pulls |
| Streaks | Two separate (feed + focus) | **Merged into one daily streak** | Simpler mental model for MVP; split later if needed |
| Screen time tracking | Required | **Optional (app works without it)** | UsageStats permission requires manual Settings navigation; many users drop off |
| Onboarding | None | **3-4 screen flow added** | Users need to name pet, understand loop, grant permissions |
| Focus timer | Preset pills (15/30/60) | **Circular slider, 1-60 minutes** | More flexible; lowers barrier with short sessions |
| Mood calculation | Once daily at 9pm | **Real-time after every session/feed** | Immediate feedback; no missed reward for late sessions |
| Music | 3 tracks (2 gated) | **1 free track; others gated** | Reduces MVP scope; still has monetization hook |
| Framework | Bare React Native | **Expo with dev builds** | Familiar tooling; easier setup; still supports native modules |
| Wake lock library | react-native-wake-lock | **Cut (redundant)** | react-native-background-actions already handles this |
| background-actions install | Session 11 (cheat detection) | **Moved to Session 17 (music)** | Grace period only needs built-in AppState — no native module required. Library needs a dev build anyway (won't run in Expo Go), so defer until Session 17 when a dev build is already needed for react-native-track-player. Install both native modules in one build. |
| App name | PetPal | **PetBloom** | Rebrand — `app.json`, `package.json`, Android package `com.petbloom.app`, color export `PetBloomColors`, all docs updated |
| "Focus Session" framing | Task-oriented ("Focus Session", "Start Focus Session") | **Pochi-centric ("Time with [name]", "Step Away")** | Lowers the bar — session = choosing Pochi, not a productivity commitment. Tab renamed to "Step Away", stats renamed to "Away time" / "Visits" |
| Onboarding | 4 steps (Welcome → Name Pochi → How It Works → Permissions) | **5 steps (Welcome → Meet Pochi → Meet Mochi → How It Works → Notifications)** | Second pet (Mochi) introduced in onboarding; both names user-assignable; Permissions step replaced with Notifications step |
| Pet naming | Pochi only, named once, not changeable | **Both Pochi + Mochi named during onboarding; changeable in Settings** | Settings screen added; gear icon on Home header; `normalizePetName()` utility handles validation |
| First-feed experience | Fish shown immediately | **Egg hatches into fish on first feed** | One-time delight moment — egg wiggles on each tap, cracks and reveals fish with spring animation |
| Feed haptics | `notificationAsync(Warning)` per tap, `notificationAsync(Success)` on completion | **`notificationAsync(Error)` for all** | Error pattern produces the strongest vibration via this API |
| Duration input | Circular slider only | **Circular slider + optional HH:MM drum picker behind a `Manual` toggle** | User can set precise durations up to 5h 55m; toggle state persisted so mode is remembered between sessions |
| Quest currency | Abstract XP reward | **Coins 🪙 (soft currency, +50 per quest)** | Coins are tangible and spendable in a future shop; XP stays as a pure evolution counter. Gems 💎 (hard/premium currency) deferred until IAP is wired — wrong shape to define early |
| Quest tab placement | Quest card on Home screen | **Dedicated Quests tab (position 2: Home · Quests · Step Away · Stats · Journey)** | Gives quests their own destination; users who want to check/claim have a clear place to go |
| Recent durations cap | 3 entries | **5 entries** | More history visible on screen without cluttering; Quick-start chips benefit from longer recall |
| Session notification body | `"Session ends at X:XX PM — stay focused!"` | **`"25 min · Ends at 2:30 PM"` — duration included; stays in tray after session completes** | User requested duration visible in notification; persistent notification avoids "why did this disappear?" confusion |
| Stats duration display | Raw minutes (`80m`) | **Formatted (`1h 20m`)** | More readable for longer sessions; `formatDuration()` utility shared across all stat displays |
| Rain sounds in Focus screen | Planned for Phase 5 | **UI placeholder removed early** | Toggle was non-functional (no audio wired); removing prevents user confusion; music re-added properly in Phase 5 |

---

## 🎯 App Concept

PetPal is a **virtual pet + focus app** for Android. Your pet Pochi's mood and growth are directly tied to your phone habits:

- ✅ Complete focus sessions → Pochi gets happier and evolves
- ✅ Feed Pochi daily → keep your streak alive
- ✅ Less screen time → Pochi thrives (if permission granted)
- ❌ Switch apps during focus → 10-second warning, then session ends
- ❌ Too much screen time → Pochi gets sick (if permission granted)

**Core loop:** Feed daily (30 sec) + focus sessions (1-60 min) + check stats = habit formed.

**Daily streak rule:** Feed Pochi + complete at least 1 focus session = streak maintained.

**Target platform:** Android first (iOS in v2)

---

## 🧩 Core Features (MVP)

- [ ] Onboarding flow (name pet, explain loop, permissions)
- [ ] Virtual pet (Pochi) with real-time mood states
- [ ] Focus session with circular slider timer (1-60 min)
- [ ] AppState cheat detection with 10-second grace period
- [ ] Screen-off allowed without penalty (no proximity sensor needed)
- [x] Tap to feed mechanic (3 taps, once per 20hrs)
- [ ] Unified daily streak counter (feed + focus)
- [ ] Local storage (no backend needed)
- [ ] 1 calm background music track during focus (Rain)
- [ ] Basic push notifications
- [ ] Screen time tracking — **optional** (UsageStats API, app works without it)
- [ ] Stats screen (daily + weekly chart)
- [ ] Pet evolution path (Egg → Legendary)
- [ ] Progress/Journey screen (evolution timeline)
- [x] Daily quest system (1 quest/day, 5 types, resets at midnight)
- [x] Coins 🪙 — soft currency earned from quests

---

## 🛠️ Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Expo (with dev builds) | Familiar, easier setup, still supports native modules |
| Language | TypeScript | Type safety, better DX |
| Local storage | AsyncStorage | No backend needed for MVP |
| Pet animations | Lottie (lottie-react-native) | Free animations, lightweight |
| Screen time | UsageStats API (custom native module via expo-modules-api) | Android built-in; **optional feature** |
| Focus session | AppState (built-in RN) | Detects app going to background |
| Background timer | react-native-background-actions | Timer runs when screen is off; also handles wake lock |
| Music | react-native-track-player | Easy audio playback, background support |
| Notifications | expo-notifications | Expo-native, simpler setup than notifee |
| Navigation | Expo Router or React Navigation | Standard, well-documented |
| Charts | react-native-chart-kit + react-native-svg | Weekly stats visualization |

### Removed from stack
| Removed | Reason |
|---|---|
| react-native-wake-lock | Redundant; background-actions handles this |
| react-native-proximity | Cut; unreliable face-down detection |
| @notifee/react-native | Replaced with expo-notifications for simpler Expo integration |

---

## 📁 Project Structure

```
PetPalApp/
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.tsx    # Name pet + explain loop + permissions
│   │   ├── HomeScreen.tsx          # Pet + mood + feed button
│   │   ├── FocusScreen.tsx         # Session timer + music
│   │   ├── FeedScreen.tsx          # Tap to feed mechanic
│   │   ├── StatsScreen.tsx         # Daily + weekly chart
│   │   └── ProgressScreen.tsx      # Evolution timeline
│   ├── components/
│   │   ├── PetDisplay.tsx          # Pochi + mood + animation
│   │   ├── CircularSlider.tsx      # Focus duration picker (1-60 min)
│   │   ├── TimerCircle.tsx         # Circular countdown timer
│   │   ├── WeeklyChart.tsx         # Bar chart for stats
│   │   ├── EvolutionCard.tsx       # Single evolution milestone
│   │   └── GraceOverlay.tsx        # 10-sec warning when app backgrounded
│   ├── services/
│   │   ├── FocusService.ts         # Session logic + AppState + grace period
│   │   ├── ScreenTimeService.ts    # UsageStats API wrapper (optional)
│   │   ├── MoodService.ts          # Real-time mood calculation
│   │   ├── MusicService.ts         # Track player controls
│   │   └── NotificationService.ts  # Push notification logic
│   ├── storage/
│   │   └── AppStorage.ts           # AsyncStorage helpers
│   ├── constants/
│   │   ├── PetStates.ts            # Mood + evolution configs
│   │   ├── Colors.ts               # App color palette
│   │   └── Sounds.ts               # Music track list
│   ├── assets/
│   │   ├── animations/             # Lottie JSON files
│   │   └── sounds/                 # MP3 calm music files
│   └── App.tsx                     # Root + navigation
├── app.json                        # Expo config
├── package.json
└── README.md
```

---

## 🚀 Onboarding Flow (First Launch Only)

### Screen 1 — Welcome
- Egg animation in center
- "Meet your new friend!" heading
- "Your habits shape who they become" subtext
- "Let's go" button

### Screen 2 — Name Your Pet
- Egg with curious eyes animation
- "What will you name me?" prompt
- Text input (default: "Pochi")
- Character limit: 12 characters

### Screen 3 — How It Works
- Simple 3-icon explanation:
  - 🍎 "Feed me daily" — tap to feed once a day
  - 🎯 "Focus with me" — I grow when you focus
  - 📊 "Watch me evolve" — the more you focus, the stronger I get
- "Got it!" button

### Screen 4 — Permissions (Optional)
- "Want me to track your screen time too?"
- Explanation: "This helps me react to how much you use your phone"
- "Enable" button → opens Android Settings for UsageStats
- **"Skip for now"** button → app works fine without it
- Permission state saved; can be enabled later from Stats screen

### Storage
```typescript
'onboardingComplete'    // boolean
'petName'               // string (default: "Pochi")
'usageStatsEnabled'     // boolean
```

---

## 📱 Screen Breakdown

### 1. 🏠 Home Screen
**Purpose:** Main hub — see pet, start focus, check today at a glance

**Elements:**
- Greeting + date + pet name
- Streak badge (🔥 5 day streak)
- Pet display (Lottie animation based on current mood)
- Pet name + mood label
- XP progress bar (sessions toward next evolution)
- "Start Focus Session" button → goes to Focus screen
- "Feed [name]" button → goes to Feed screen (with indicator if available)
- Today's stats row: Screen time (if enabled) | Focus time | Personal best
- Pet's daily message (changes based on mood — random from pool)

---

### 2. 🎯 Focus Screen
**Purpose:** Run a focus session with customizable timer

**Elements:**
- **Circular slider** to pick duration: 1-60 minutes (drag to set)
- Preset shortcut chips: 5 / 15 / 30 / 60 min (tap to snap slider)
- Pet preview (playing animation)
- Music toggle: Rain 🌧️ On/Off (single track for MVP)
- Volume slider
- "Start — I won't touch my phone!" button

**During session:**
- Live countdown with circular progress
- Running/playing pet animation
- "Give up" button (small, not prominent)
- Lock screen notification: "[Name] is waiting... 14:32 remaining"

**Grace period (when app goes to background):**
- 10-second countdown overlay appears when user returns
- "Your session is about to end! Come back!"
- If user returns within 10 seconds → session continues
- If 10 seconds pass → session failed, pet sad animation
- Phone calls / quick notification checks are safely handled

**Session complete:**
- Celebration animation + confetti
- "+1 session! [Name] is happy! 🎉"
- XP gained shown
- Check if evolution milestone reached

---

### 3. 🍎 Feed Screen
**Purpose:** Quick daily interaction — tap to feed pet

**Elements:**
- Hungry pet animation (🥺 eyes)
- "[Name] is hungry! Tap to feed" message
- Tap counter (0/3 taps)
- Food particle animation on each tap
- **Haptic feedback on each tap** (vibration)
- Pet reacts to each tap (shakes, opens mouth)
- Completion animation when 3 taps done
- "Come back in Xhr" cooldown message (20hr reset)

**If already fed:**
- Happy/full pet animation
- "Come back in Xhr" message
- Streak info shown

---

### 4. 📊 Stats Screen
**Purpose:** Show focus time + optional screen time + weekly chart

**Elements:**
- Today card: Focus time (green) + Screen time (coral, only if UsageStats enabled)
- If UsageStats not enabled: "Enable screen time tracking" prompt with button
- Weekly bar chart: 7 days of focus time
- Personal best badge (🏆 highlighted day)
- Weekly total focus time
- Average daily focus time

---

### 5. 🐣 Progress Screen (Journey)
**Purpose:** Show pet evolution path, motivate long-term retention

**Elements:**
- Current pet display + name + stage label
- Progress bar (sessions toward next evolution)
- Next evolution preview (what's coming)
- Full evolution timeline (all 6 stages)
- Completed stages shown in color; locked stages greyed out
- Milestone celebration card (shareable)

---

## 🐾 Pet Mood System

Pochi's mood is calculated **in real-time** — it updates immediately when the user completes a session or feeds the pet.

### Mood Score Calculation
```
Mood Score = Focus Sessions (today) + Feed (done/not) − Screen Time Penalty (if enabled)
```

### Mood States

| Mood | Trigger | Lottie Animation |
|---|---|---|
| 🌟 Thriving | 2+ sessions + fed + under 3hrs screen (or no tracking) | Jumping, sparkles |
| 😊 Happy | 1 session + fed | Bouncing gently |
| 😐 Okay | Fed but no session OR unfed but 1 session | Sitting still |
| 😴 Tired | No session + not fed | Droopy eyes, slow |
| 🤒 Sick | Not fed for 2+ days + no sessions + 7hrs+ screen (if tracked) | Shivering, pale |

### Rules
- Mood updates **immediately** after each session completion and each feed
- If UsageStats is not enabled, screen time penalty is ignored (pet is slightly easier to keep happy)
- Pet **never dies permanently** — only gets sick
- Sick pet can be nursed back by feeding + completing a session
- Mood factors reset fresh each day at midnight — no permanent punishment

### Implementation
```typescript
// MoodService.ts — called after every session and feed
function calculateMood(today: DailyData): MoodState {
  const { sessionsCompleted, isFed, screenTimeHours, screenTimeEnabled } = today;

  if (sessionsCompleted >= 2 && isFed && (!screenTimeEnabled || screenTimeHours < 3)) {
    return 'thriving';
  }
  if (sessionsCompleted >= 1 && isFed) {
    return 'happy';
  }
  if (isFed || sessionsCompleted >= 1) {
    return 'okay';
  }
  // Check multi-day neglect for sick state
  if (daysSinceLastFed >= 2 && sessionsCompleted === 0) {
    return 'sick';
  }
  return 'tired';
}
```

---

## 🥚 Pet Evolution System

Evolution is based on **cumulative total sessions ever completed** — never resets.

| Stage | Sessions needed | Pet | Unlock reward |
|---|---|---|---|
| Egg | 0 | 🥚 | Starting state |
| Baby Chick | 10 | 🐣 | New food options |
| Fluffy Chick | 25 | 🐥 | Accessories slot |
| Teen Bird | 50 | 🐦 | New background theme |
| Adult Eagle | 100 | 🦅 | Special animation |
| Legendary | 200 | 🦄 | Shareable card + badge |

### Evolution Moment
When user hits a milestone:
1. Celebration screen with confetti
2. Pet transformation animation
3. Shareable card generated ("[Name] evolved! 🎉")
4. New features unlocked notification

---

## ⏱️ Focus Session Logic

### Flow
```
User drags circular slider (1-60 min) or taps preset chip
         ↓
User toggles music on/off
         ↓
Tap "Start"
         ↓
BackgroundService.start()    ← timer runs even when screen off
Music.play() (if enabled)    ← calm music starts
AppState listener ON         ← cheat detection starts
         ↓
Timer counts down
         ↓
IF AppState → background:
  → Start 10-second grace timer
  → IF user returns within 10s → session continues
  → IF 10s expires → Session FAILED
    → Music stops
    → Pet sad animation
    → "You broke [Name]'s heart 💔"
         ↓
IF timer reaches 0:
  → Session COMPLETE ✅
  → Music stops
  → BackgroundService.stop()
  → +1 session added to total
  → Mood recalculated immediately
  → Pet celebration animation
  → Check if evolution milestone reached
  → Check if streak should update
```

### AppState Detection with Grace Period
```typescript
let graceTimer: NodeJS.Timeout | null = null;

AppState.addEventListener('change', (nextState) => {
  if (nextState === 'background' && sessionActive) {
    // Start 10-second grace period
    graceTimer = setTimeout(() => {
      endSession(false); // Session failed after grace period
    }, 10000);
  }

  if (nextState === 'active' && graceTimer) {
    // User came back in time — continue session
    clearTimeout(graceTimer);
    graceTimer = null;
  }
});
```

### Screen Off Handling
```typescript
// react-native-background-actions keeps the timer running
// when the screen turns off. No wake lock needed separately.

import BackgroundService from 'react-native-background-actions';

const options = {
  taskName: 'PetPal Focus',
  taskTitle: `${petName} is waiting...`,
  taskDesc: 'Focus session in progress',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
};

await BackgroundService.start(timerTask, options);
```

---

## 🍎 Tap to Feed Mechanic

### Rules
- Available once every **20 hours** (not 24 — gradual earlier habit)
- Requires **3 taps** to complete feeding
- Each tap: food particle animation + haptic vibration + pet reacts
- Completing feeding counts toward **daily streak** (combined with focus)
- Missing 2+ days: pet looks extra hungry 🥺

### Storage Keys (AsyncStorage)
```typescript
'lastFedTime'      // Timestamp of last completed feeding
'totalFeeds'       // Lifetime total feeds
```

### Logic
```typescript
const hoursSinceLastFeed = (Date.now() - lastFedTime) / 3600000;
const canFeed = hoursSinceLastFeed >= 20;
```

---

## 🔥 Streak System (Unified)

### Single Daily Streak
A day counts toward your streak if **both conditions are met**:

1. ✅ Fed the pet (completed 3 taps)
2. ✅ Completed at least 1 focus session (any duration)

### Rules
- Streak checks at midnight (local time)
- If both conditions met → streak increments
- If either condition missed → streak resets to 0
- Streak displayed on Home screen

### Storage Keys
```typescript
'currentStreak'        // number — consecutive days
'lastStreakDate'       // ISO date string of last qualifying day
'longestStreak'        // number — all-time best streak
```

### Logic
```typescript
function updateStreak(today: DailyData): void {
  const todayDate = new Date().toISOString().split('T')[0];

  if (today.isFed && today.sessionsCompleted >= 1) {
    if (lastStreakDate === yesterday) {
      currentStreak += 1;
    } else if (lastStreakDate !== todayDate) {
      currentStreak = 1; // Start new streak
    }
    lastStreakDate = todayDate;
    longestStreak = Math.max(longestStreak, currentStreak);
  }
}
```

---

## 📊 Stats System

### Daily Stats
```typescript
// If UsageStats enabled:
const stats = await UsageStats.queryUsageStats(startOfDay, now);
const totalScreenTime = stats.reduce((acc, app) =>
  acc + app.totalTimeInForeground, 0);

// If not enabled: screen time section hidden, no penalty applied
```

### Locally Tracked Data (AsyncStorage)
```typescript
'sessionsToday'        // Focus sessions completed today
'focusTimeToday'       // Total focus minutes today
'personalBest'         // Best ever daily focus minutes
'weeklyFocusData'      // Array of last 7 days focus minutes
'totalSessionsEver'    // Lifetime sessions (drives evolution)
```

### Personal Best Logic
```typescript
if (focusTimeToday > personalBest) {
  personalBest = focusTimeToday;
  // Show "New personal best!" celebration
}
```

---

## 🎵 Music System

### MVP: Single Free Track
| Track | File | Source |
|---|---|---|
| 🌧️ Rain sounds | rain-focus.mp3 | pixabay.com/music (free, no attribution needed) |

### Gated for Later (v2 IAP)
| Track | File | Unlock |
|---|---|---|
| 🌲 Forest ambience | forest-calm.mp3 | €1.99 one-time |
| 🎵 Lo-fi beats | lofi-study.mp3 | €1.99 one-time |

### Implementation
```typescript
import TrackPlayer from 'react-native-track-player';

await TrackPlayer.setupPlayer();

await TrackPlayer.reset();
await TrackPlayer.add({
  url: require('./assets/sounds/rain-focus.mp3'),
  title: 'Rain Focus',
  artist: 'PetPal',
});
await TrackPlayer.setRepeatMode(RepeatMode.Track); // Loop during session
await TrackPlayer.play();
```

---

## 🔔 Notifications

### Notification Types

| Trigger | Message | Time |
|---|---|---|
| Pet hungry | "[Name] is hungry! Come feed me 🥺" | 20hrs after last feed |
| Daily reminder | "Have you focused today? [Name] is waiting 🐣" | 7pm daily |
| Streak at risk | "Your 5-day streak ends tonight! 🔥" | 9pm if missing feed or session |
| Evolution close | "Just 3 sessions until [Name] evolves! 🐥→🐦" | On app open |
| Session running | "[Name] is waiting... 14:32 remaining 🐣" | During session (ongoing) |

### Implementation
```typescript
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: `${petName} is hungry!`,
    body: `Come feed me 🥺 — tap to open PetPal`,
  },
  trigger: {
    seconds: 72000, // 20 hours
  },
});
```

---

## 💰 Monetization Plan

### Phase 1 — MVP (Free)
- Entire app free with 1 music track
- Goal: get users, validate concept

### Phase 2 — Soft Monetization
| IAP | Price | What it gives |
|---|---|---|
| Premium sounds pack | €1.99 one-time | Forest + Lo-fi tracks |
| Remove ads | €1.99 one-time | No rewarded ads |
| Streak shield | €0.99 each | Protect streak for 1 day |
| Pet accessories pack | €2.99 | Hats, beds, toys for pet |

### Phase 3 — Subscription (after 10k users)
| Plan | Price | What it gives |
|---|---|---|
| PetPal Pro | €2.99/month | All sounds + accessories + no ads + streak shields |

---

## 🗓️ MVP Build Phases

Sized for **45-60 minute development sessions**. Each chunk is a self-contained task you can complete in one sitting.

---

### Phase 1 — Project Setup & Foundations (3-4 sessions)

**Session 1: Project Scaffolding**
- [ ] Create Expo project with TypeScript template
- [ ] Install navigation (Expo Router or React Navigation)
- [ ] Set up bottom tab navigation (4 tabs: Home, Focus, Stats, Journey)
- [ ] Create placeholder screens for each tab
- [ ] Verify app runs on Android emulator or device

**Session 2: Storage & Data Layer**
- [ ] Install AsyncStorage
- [ ] Create `AppStorage.ts` helper (get/set/clear wrappers)
- [ ] Define all storage keys as TypeScript constants
- [ ] Create `PetStates.ts` with mood and evolution configs
- [ ] Create `Colors.ts` with app color palette
- [ ] Write seed data function (first launch defaults)

**Session 3: Onboarding Flow**
- [ ] Build onboarding screens (Welcome → Name → How It Works → Permissions)
- [ ] Name input with 12-char limit and default "Pochi"
- [ ] Save onboarding state to AsyncStorage
- [ ] Skip to Home if already onboarded
- [ ] Permissions screen with "Enable" and "Skip" buttons (UsageStats can be wired later)

**Session 4 (if needed): Onboarding Polish**
- [ ] Add egg animation to welcome screen (start with emoji, swap for Lottie later)
- [ ] Add transitions between onboarding screens
- [ ] Test full onboarding → Home flow

**Phase 1 goal:** App runs, navigates between tabs, onboarding works, data layer ready.

---

### Phase 2 — Pet Display & Mood (3-4 sessions)

**Session 5: Home Screen Layout**
- [ ] Build Home screen layout (greeting, streak badge, pet area, buttons, today stats)
- [ ] Display pet name from storage
- [ ] Show pet using emoji (🥚 → 🐣 → etc.) — Lottie later
- [ ] "Start Focus" and "Feed [Name]" buttons (navigation only for now)
- [ ] Date display

**Session 6: Mood System**
- [ ] Implement `MoodService.ts` with `calculateMood()` function
- [ ] Wire mood to pet display (different emoji per mood)
- [ ] Show mood label below pet
- [ ] Add daily message pool (3-5 messages per mood state)
- [ ] Test mood changes by manually adjusting storage values

**Session 7: XP & Evolution Display**
- [ ] Build XP progress bar component
- [ ] Show "X/Y sessions to next evolution" on Home screen
- [ ] Build Progress/Journey screen with full evolution timeline
- [ ] Locked stages shown greyed out, completed in color
- [ ] Current stage highlighted

**Session 8 (if needed): Evolution Celebrations**
- [ ] Build evolution celebration overlay (confetti + transformation)
- [ ] Trigger celebration when milestone reached
- [ ] Generate shareable card text
- [ ] Test evolution flow by adjusting session count

**Phase 2 goal:** Pet visible on Home with correct mood, evolution timeline works, XP tracking functional.

---

### Phase 3 — Focus Session (4-5 sessions)

**Session 9: Focus Screen UI**
- [ ] Build circular slider component for duration (1-60 min)
- [ ] Add preset chips (5, 15, 30, 60) that snap slider
- [ ] Show selected duration prominently
- [ ] Pet preview area
- [ ] "Start" button

**Session 10: Timer & Countdown**
- [ ] Build circular countdown timer component
- [ ] Timer counts down from selected duration
- [ ] Display remaining time in MM:SS
- [ ] "Give up" button (small, bottom of screen)
- [ ] Session complete triggers: stop timer, show celebration

**Session 11: Focus Session State Machine & Honest Reporting**
- [x] Implemented `FocusService` state machine (`idle → active → completed`) — pure TS, no RN deps
- [x] Removed AppState cheat detection entirely — screen lock triggers `background` indistinguishably from app-switching; enforcing it caused false failures
- [x] On session complete, user is shown a choice: **"Save session"** or **"Don't save — I cheated"** — session data only written on explicit save
- [x] `giveUp()` handles both `active → idle` and `completed → idle` (for the don't-save path)
- [x] Tab bar hidden during active session via `navigation.setOptions`
- [x] Persistent notification shown on session start ("Session ends at X:XX PM") via `expo-notifications`; dismissed on end/give-up
- [x] Completion notification removed — session end time in the start notification is sufficient; eliminates Android Doze timing accuracy problem entirely
- [x] Recent durations: last 3 unique saved session durations stored in `STORAGE_KEYS.RECENT_DURATIONS`; shown as quick-start chips on Focus screen (replaces static presets); tapping a chip starts the session immediately; chips hidden on fresh install

**Session 12: Session Integration**
- [x] Wire session complete → increment sessionsToday + totalSessionsEver
- [x] Wire session complete → recalculate mood immediately
- [x] Wire session complete → check evolution milestone (home screen detects via useFocusEffect on return)
- [x] Wire session complete → update streak data (`StreakService.ts` — pure `calculateStreak()` + `updateStreakAfterSession()` storage wiring; 8 TDD tests)
- [x] Update Home screen stats after returning from session (useFocusEffect)
- [ ] Pet sad animation on failed session (deferred — give-up is silent by design)

**Session 13 (if needed): Edge Cases & Polish**
- [ ] Handle app crash during session (check for incomplete session on app start)
- [ ] Handle midnight crossing during session (count toward day session started)
- [ ] Test various durations (1 min, 5 min, 60 min)

**Phase 3 goal:** Full working focus session with cheat detection, grace period, and integration with mood/evolution/streak.

---

### Phase 4 — Feed Mechanic (2-3 sessions)

**Session 14: Feed Screen**
- [x] Build Feed screen with hungry/feeding/full/cooldown states
- [x] Tap counter with dot progress indicator (3 taps — reduced from 10 after UX research; 2–4 taps is the industry sweet spot for daily rituals)
- [x] Pet reacts on each tap (scale bounce animation)
- [x] Add haptic feedback on each tap (`expo-haptics` — `notificationAsync(Warning)` used instead of `selectionAsync`/`impactAsync` for reliable Android support)
- [x] Completion: triple `notificationAsync(Success)` at 0/180/360ms for dopamine hit
- [x] Food particle animation on each tap (🫧 bubbles float up and fade, 4 particles per tap with randomised x-offset and duration)

**Unplanned — FeedService (TDD, 15 tests)**
- [x] `getFeedPetStage(totalFeeds)` — 6 growth stages (Tiny/Small/Medium/Big/Large/Giant), thresholds front-loaded at 0/3/10/21/50/100 feeds (based on habit-formation research)
- [x] `getFeedPetSize(stage)` — font size 36/52/68/84/100/120 — same 🐟 emoji scales up visually
- [x] `canFeed(lastFedTime)` — true if never fed or 20+ hours elapsed
- [x] `timeUntilNextFeed(lastFedTime)` — formats remaining cooldown as "4h", "30m", "2h 30m"
- [x] `feedsToNextStage(totalFeeds)` — feeds remaining to next growth stage, `null` at max
- [x] `feedProgressPercent(totalFeeds)` — 0–100% progress within current stage band
- [x] Growth progress bar always visible, showing feeds to next stage + percentage
- [x] Separate fish pet (Mochi) — independent of Pochi, grows through daily feeding
- [x] Storage keys added: `FEED_PET_NAME`, `TOTAL_FEEDS`, `LAST_FED_TIME`

**Session 15: Feed Logic & Cooldown**
- [x] Implement 20hr cooldown logic
- [x] Show "Come back in Xhr" when on cooldown
- [x] Show happy/full state when already fed
- [ ] Wire feed complete → recalculate mood
- [ ] Wire feed complete → update streak data
- [ ] Update Home screen feed button indicator

**Session 16 (if needed): Feed Polish**
- [x] Food particle animation on each tap *(moved up, done in Session 14)*
- [ ] More expressive pet reactions (mouth open, shaking)
- [ ] Test cooldown edge cases (timezone changes, etc.)

**Session 16–17: Onboarding Overhaul, Settings, UX Reframe & App Rename**
- [x] **App renamed PetPal → PetBloom** — `app.json` (name/slug/scheme/package), `package.json`, `PetBloomColors` export, all docs, `#PetBloom` share hashtag
- [x] **Onboarding rebuilt as 5-step flow** (Welcome → Meet Pochi → Meet Mochi → How It Works → Notifications):
  - Welcome: two floating eggs (staggered animation), "Meet your new friends!"
  - Meet Pochi: name input + evolution description ("Put your phone down and I'll grow"); rename hint above CTA
  - Meet Mochi: name input + feeding description; same rename hint
  - How It Works: updated rows referencing both pets by chosen names (`🐾 Spend time with [Pochi]` / `🐟 Feed [Mochi] daily`)
  - Notifications: replaces Permissions step; requests `expo-notifications` permission; "Don't let us starve!" copy; skip works
  - Both names saved via `normalizePetName()` to `PET_NAME` + `FEED_PET_NAME` on finish
- [x] **`src/utils/petName.ts`** — `normalizePetName(input, fallback)`: trims, caps 12 chars, fallback if empty; 5 TDD tests
- [x] **Settings screen** (`app/settings.tsx`) — rename Pochi + Mochi; gear icon in Home header; save button with ✓ confirmation
- [x] **First-feed hatching animation** — egg shown until first feed; wiggles on each tap; cracks and reveals fish with spring-in on completion; `position: absolute` overlay prevents layout shift; one-time, never replays
- [x] **UX reframe — Pochi-centric language across all screens:**
  - Tab: `Focus` → `Step Away`; setup title: `Focus Session` → `Time with [name]`
  - Active: `Stay focused!` → `You're with [name] ☁️`; hint: `Phone down. [name] needs you.`
  - Give up: `Go back to my phone`; completion: `You showed up! 🎉`
  - Save: `Count this time 🌟`; cheat: `Don't save — I looked at my phone`
  - Home CTA: `🐾 Time with [name]`; stats: `Away time` / `Visits`
- [x] **Bug fix:** Home feed button now reads `FEED_PET_NAME` (was incorrectly showing focus pet's name)
- [x] **Haptics increased** — all feed taps + completion now use `notificationAsync(Error)` (strongest available pattern)

**Phase 4 goal:** Feeding works with cooldown, haptics, and full mood/streak integration.

---

### Phase 5 — Music & Notifications (2-3 sessions)

**Session 17: Music System & Background Timer**
- [ ] Install react-native-track-player
- [ ] Install react-native-background-actions (deferred from Session 11 — requires dev build; install alongside track-player in one build)
- [ ] Wire background-actions to keep countdown timer running when screen is off
- [ ] Set up player (run once at app start)
- [ ] Download and add rain-focus.mp3 from Pixabay
- [ ] Add music toggle on Focus screen
- [ ] Music plays during session, stops on end
- [ ] Loop track for entire session duration
- [ ] Volume slider

**Session 18: Notifications**
- [ ] Install expo-notifications
- [ ] Set up notification channel for Android
- [ ] Implement "pet hungry" notification (20hrs after feed)
- [ ] Implement "daily reminder" (7pm if no session)
- [ ] Implement "streak at risk" (9pm if conditions not met)
- [ ] Foreground notification during focus session with countdown

**Session 19 (if needed): Notification Polish**
- [ ] Test notification scheduling accuracy
- [ ] Handle notification taps (deep link to correct screen)
- [ ] Clear stale notifications on app open

**Phase 5 goal:** Music plays during focus, all key notifications working.

---

### Phase 6 — Stats & Screen Time (2-3 sessions)

**Session 20: Stats Screen**
- [x] react-native-svg already installed (used by circular components) — react-native-chart-kit skipped; custom View-based bar chart built instead (no new dependency)
- [x] Build weekly bar chart (7 bars: last 6 from `WEEKLY_FOCUS_DATA` + today's `FOCUS_TIME_TODAY`)
- [x] Build today's stats card (focus time + personal best)
- [x] Highlight personal best day in chart (peak bar highlighted in streak orange)
- [x] Show weekly total and daily average
- [x] `StatsService.ts` — pure functions: `buildWeekBars`, `buildDayLabels`, `findPeakIndex`; 9 TDD tests
- [x] `stats.tsx` wired with `useFocusEffect` to reload on screen focus

**Unplanned — Duration Picker, formatDuration & UX cleanup (this session)**
- [x] `src/utils/durationPicker.ts` — pure utilities with 21 TDD tests:
  - `minutesToHHMM(minutes)` → `{ hours, mins }`
  - `HHMMToMinutes(hours, mins)` → total minutes
  - `clampDuration(minutes)` → clamped to `[1, 355]` (max 5h 55m)
  - `formatDuration(minutes)` → `"25m"` / `"1h"` / `"1h 20m"` — applied to all stat displays (stats.tsx + index.tsx)
- [x] `components/duration-picker.tsx` — HH:MM snap-scroll drum picker:
  - Two `ScrollView` columns: hours (0–5), minutes (0–59); `nestedScrollEnabled` avoids VirtualizedList nesting error
  - Selection band overlay with primary-colour border; selected item bold + larger
  - `STORAGE_KEYS.MANUAL_DURATION_MODE` persists toggle state between app opens
- [x] `app/(tabs)/focus.tsx` — `Manual` toggle switch (`Switch` component): when ON replaces `CircularSlider` with `DurationPicker`; mode loaded on mount and saved on change; rain sounds toggle removed (music deferred to Phase 5)
- [x] `src/storage/recentDurations.ts` — cap increased 3 → 5; tests updated
- [x] `src/services/NotificationService.ts` — notification body now includes duration (`"25 min · Ends at 2:30 PM"`); notification no longer auto-cancelled on session complete — stays until user manually dismisses; still cancelled on give-up and screen blur; 1 new TDD test

**Session 21: UsageStats Integration (Optional)**
- [ ] Create native module wrapper for UsageStats API (expo-modules-api)
- [ ] Request PACKAGE_USAGE_STATS permission with guided walkthrough
- [ ] Read today's total screen time
- [ ] Display screen time on Stats screen (if enabled)
- [ ] Wire screen time into mood calculation (if enabled)
- [ ] Add "Enable screen time" prompt on Stats screen for users who skipped

**Session 22 (if needed): Stats Polish**
- [ ] Test chart with various data amounts (0 days, 1 day, 7 days)
- [ ] Handle edge case: first day (no history)
- [ ] Personal best celebration when broken

**Phase 6 goal:** Stats screen with weekly chart, optional screen time tracking.

---

---

### Unplanned — Daily Quest System (PET-12, TDD, 27 tests)

Built between Phase 6 and Phase 7. See `docs/quest-system.md` for full design detail.

**QuestService.ts (pure logic — 27 TDD tests)**
- [x] 5 quest types: `early_bird`, `long_sit`, `quality_time`, `consistency`, `care_package`
- [x] `selectTodaysQuest(dayIndex)` — deterministic via `dayIndex % 5`; same quest all day, never repeats two days in a row
- [x] `evaluateProgress(state, event, def)` — immutable update; handles count / minutes / bit-flag progress modes
- [x] `care_package` uses bit flags (bit 0 = fed, bit 1 = session done; value 3 = both done) — order-independent
- [x] `isQuestComplete`, `isQuestStale`, `createFreshQuestState` — pure helpers
- [x] `getTodayDateString()` — YYYY-MM-DD in local time (consistent with streak date convention)

**QuestStorage.ts (storage wiring)**
- [x] `loadOrInitQuestState()` — reads `DAILY_QUEST` from AsyncStorage; resets if stale date
- [x] `recordQuestEvent(event)` — called after session save and feed complete; no-op if already claimed
- [x] `claimQuestReward()` — awards +50 🪙 coins, marks `claimed: true`; guards against double-award
- [x] `getCoins()` — returns current balance (0 if unset)

**Storage keys added**
- [x] `DAILY_QUEST` — `DailyQuestState` JSON: `{ date, questId, completed, claimed, progress }`
- [x] `COINS` — number; running coin balance

**Hooks into existing flows**
- [x] `app/(tabs)/focus.tsx` — `recordQuestEvent({ type: 'session', durationMinutes, startedAt })` called after `updateStreakAfterSession()`
- [x] `app/feed.tsx` — `recordQuestEvent({ type: 'feed' })` called on 3rd tap completion

**Quests tab screen (`app/(tabs)/quests.tsx`)**
- [x] New tab added at position 2 — `star.fill` icon; order: Home · Quests · Step Away · Stats · Journey
- [x] Quest card: emoji icon, name, description, progress bar (X/target), reward badge (🪙 +50)
- [x] **Claim!** green button when complete + not claimed; grey arrow when in progress; green ✓ when claimed
- [x] Floating coin animation (+50 🪙 floats up and fades) on claim
- [x] Countdown timer showing time until midnight reset
- [x] Coin balance displayed in header (🪙 N amber badge)

**Home screen update**
- [x] Coin balance shown next to streak badge (🪙 N in amber badge); reloads on focus

---

### Phase 7 — Polish & Ship (3-4 sessions)

**Session 23: Visual Polish**
- [ ] Replace emoji pets with Lottie animations (if assets ready)
- [ ] Add screen transitions
- [ ] Consistent color scheme across all screens
- [ ] Loading states for any async operations

**Session 24: Edge Cases & Testing**
- [ ] Test daily reset (midnight behavior)
- [ ] Test streak logic across multiple days
- [ ] Test evolution milestones
- [ ] Test offline behavior
- [ ] Test on 2-3 different Android devices/API levels

**Session 25: Pre-Launch**
- [ ] App icon and splash screen
- [ ] Play Store listing assets (screenshots, description)
- [ ] Build release APK/AAB with EAS Build
- [ ] Test release build on real device

**Session 26: Ship It**
- [ ] Submit to Google Play Store
- [ ] Internal testing track first
- [ ] Fix any issues from testing
- [ ] Promote to production

**Phase 7 goal:** Polished, tested app live on Play Store.

---

### Summary

| Phase | Sessions | Focus |
|---|---|---|
| 1. Setup & Foundations | 3-4 | Project, storage, onboarding |
| 2. Pet Display & Mood | 3-4 | Home screen, mood system, evolution |
| 3. Focus Session | 4-5 | Timer, cheat detection, grace period |
| 4. Feed Mechanic | 2-3 | Tap to feed, cooldown, haptics |
| 5. Music & Notifications | 2-3 | Audio playback, push notifications |
| 6. Stats & Screen Time | 2-3 | Charts, optional UsageStats |
| — Quest System (unplanned) | 2 | Daily quests, coins, Quests tab |
| 7. Polish & Ship | 3-4 | Testing, visuals, Play Store |

**Total: ~24-28 sessions** (at 45-60 min each ≈ 4-6 weeks of consistent work)

---

## 📦 Libraries Reference

```bash
# Create project
npx create-expo-app PetPalApp --template expo-template-blank-typescript
cd PetPalApp

# Navigation
npx expo install expo-router react-native-screens react-native-safe-area-context

# Pet animations
npx expo install lottie-react-native

# Storage
npx expo install @react-native-async-storage/async-storage

# Focus session (requires dev build)
npm install react-native-background-actions

# Music (requires dev build)
npm install react-native-track-player

# Notifications
npx expo install expo-notifications

# Haptics (for feed taps)
npx expo install expo-haptics

# Stats chart
npm install react-native-chart-kit react-native-svg

# Dev build (needed for native modules)
npx expo install expo-dev-client
```

### Android Permissions (app.json / app.config.js)
```json
{
  "expo": {
    "android": {
      "permissions": [
        "WAKE_LOCK",
        "FOREGROUND_SERVICE",
        "POST_NOTIFICATIONS",
        "PACKAGE_USAGE_STATS"
      ]
    }
  }
}
```

---

## 🔮 What's Deferred to v2

These were intentionally cut or deferred from MVP:

| Feature | Reason for deferral |
|---|---|
| Proximity / face-down detection | Unreliable across devices |
| Separate feed + focus streaks | Too complex for MVP |
| iOS support | iOS Screen Time API requires Apple approval |
| Spine 2D / Live2D animations | Over-engineering visuals early |
| Multiple pet types | Validate single pet first |
| Pet accessories / cosmetics shop | Needs monetization infrastructure |
| Gems 💎 (hard/premium currency) | Needs IAP or ad integration before storage shape is defined |
| Quest streak bonus (7-day run → bonus coins) | Deferred to v2 |
| Weekly mega-quest with bigger reward | Deferred to v2 |
| Quest notifications ("Your quest is waiting!") | Deferred to v2 |
| Expanded quest pool (9+ types) | 5 types sufficient for MVP rotation |
| Coin shop (spend coins on cosmetics) | Needs shop screen + item catalogue |
| Social sharing | Needs backend or deep link setup |
| Additional music tracks (Forest, Lo-fi) | Gated as IAP in Phase 2 |
| Multiplayer / friend comparisons | Needs backend |
| Premium subscription | Wait for user base |

---

## 📝 Notes

- **Start Android only** — iOS Screen Time API requires Apple approval (complex). Add iOS in v2.
- **Use emojis first** — replace with Lottie animations once core logic works. Don't over-engineer visuals early.
- **No backend for MVP** — everything in AsyncStorage. Add a backend only when you need cross-device sync or social features.
- **20hr cooldown not 24hr** — this is intentional. Gradually trains users to open the app earlier each day.
- **Pet never dies** — only gets sick. Punishment without recovery = uninstall. Recovery = retention.
- **Personal best not vs screen time** — comparing focus time to screen time is impossible to win. Personal best is always achievable.
- **Screen time is optional** — the app is fully functional without UsageStats. This removes the biggest onboarding friction point.
- **Grace period prevents rage-quits** — 10 seconds is enough to handle calls/notifications but not enough to cheat.
- **Real-time mood = instant gratification** — users see the impact of their focus session immediately.
- **Consider migrating to react-native-mmkv** if AsyncStorage becomes a performance bottleneck at scale.

---

*Built with ❤️ for Pochi 🐣*

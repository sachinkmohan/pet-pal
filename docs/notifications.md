# PetBloom Notifications

## Session Running (implemented)

| Trigger | Message | Dismissed when |
|---|---|---|
| User taps "Start" | "[Name] is waiting... 🐣 / Session ends at 3:45 PM — stay focused!" | Session completes or user gives up |

**Behaviour:** Persistent — cannot be swiped away (Android `sticky: true`). Shown immediately with `trigger: null`. Permission is requested on first session start; if denied, silently skipped.

---

## Session Complete (implemented)

| Trigger | Message |
|---|---|
| Timer reaches zero | "[Name] did it! 🎉 / You focused for 25 minutes — [Name] is so proud!" |

**Behaviour:** Fired immediately by JS when the timer completes (`trigger: null`). Dismissible.

---

## Investigation: Scheduled Completion Notification Delays

### What we tried

Initially the completion notification was pre-scheduled at session **start** using a `DATE` trigger:

```ts
trigger: {
  type: SchedulableTriggerInputTypes.DATE,
  date: new Date(now + durationSeconds * 1000),
}
```

Before that, a `TIME_INTERVAL` trigger was used:

```ts
trigger: {
  type: SchedulableTriggerInputTypes.TIME_INTERVAL,
  seconds: durationSeconds,
}
```

### The problem

Both approaches caused the notification to fire **late** (e.g. ~2 minutes for a 1-minute session).

**Root cause: Android Doze mode.** When the screen is locked, Android batches background alarms to save battery. Even `setExactAndAllowWhileIdle` (used by expo-notifications for `DATE` triggers) can be deferred to the next maintenance window — typically 1–15 minutes after the scheduled time.

A secondary bug was also found: `dismissNotificationAsync` was being used to "cancel" the scheduled notification. This only removes an already-shown notification from the tray — it has **no effect** on a future-scheduled notification. The correct API is `cancelScheduledNotificationAsync`, but even with that fix, the Doze delay remained.

### The fix

Remove pre-scheduling entirely. Instead, fire the completion notification **immediately from JS** (`trigger: null`) the moment the timer reaches zero.

- Foreground session: JS detects timer end instantly → notification fires with zero delay ✓
- Background session: JS resumes when user opens app → notification fires then, modal also shown ✓

No OS alarm scheduling = no Doze mode interference.

### Trade-off

If the user's screen is locked when the session ends, they won't receive the notification until they open the app. The sticky "Session ends at X:XX PM" notification covers this — the user knows the end time and can check their phone accordingly.

---

## Planned (Session 18)

| Trigger | Message | Time |
|---|---|---|
| 20hrs after last feed | "[Name] is hungry! Come feed me 🥺" | Scheduled at feed completion |
| No session by 7pm | "Have you focused today? [Name] is waiting 🐣" | Daily at 7pm |
| Streak at risk (9pm, conditions not met) | "Your X-day streak ends tonight! 🔥" | Daily at 9pm |
| Close to evolution milestone | "Just 3 sessions until [Name] evolves! 🐥→🐦" | On app open |

---

## Live Countdown (Session 17 — requires dev build)

Once `react-native-background-actions` is installed, the session notification can update every second showing remaining time:

> "[Name] is waiting... 14:32 remaining 🐣"

Not possible in Expo Go — deferred until the Session 17 dev build.

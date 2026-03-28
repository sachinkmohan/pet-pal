# PetPal Notifications

## Session Running (implemented)

| Trigger | Message | Dismissed when |
|---|---|---|
| User taps "Start" | "[Name] is waiting... 🐣 / Focus session in progress — stay off your phone!" | Session completes, user gives up, or session fails (grace period expired) |

**Behaviour:** Persistent — cannot be swiped away (Android `sticky: true`). Shown immediately. Permission is requested on first session start; if denied, silently skipped.

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

Once `react-native-background-actions` is installed, the session notification will update every second showing remaining time:

> "[Name] is waiting... 14:32 remaining 🐣"

Not possible in Expo Go — deferred until the Session 17 dev build.

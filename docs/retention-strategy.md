# Retention Strategy

Research into how Finch, Duolingo, and similar pet/habit apps keep users engaged long-term.

## What PetBloom already has

| Mechanic | Status |
|---|---|
| Streak system | ✅ |
| Pet evolution (Pochi) | ✅ |
| Feed ritual (Mochi) | ✅ |
| Mood states | ✅ |
| Focus sessions | ✅ |

---

## Top retention mechanics (research findings)

### 1. Timely push notifications from the pet
**What Finch does:** The bird sends personalized messages when the user hasn't checked in. Users feel care/guilt toward the pet rather than toward the app — a critical distinction.

**Examples for PetBloom:**
- "Pochi hasn't seen you all day 🐾"
- "Mochi is hungry... it's been a while 🐟"
- "Your streak is at risk — Pochi needs you tonight 🔥"

**Why it works:** External trigger → habit loop closure. Users who engage with notifications show significantly higher Day-7 and Day-30 retention.

**Implementation effort:** Low — `expo-notifications` is already wired.

---

### 2. Streak Shield / Streak Saver
**What Finch does:** Users earn free "Streak Repair Savers" every 3 adventures. Duolingo offers streak freezes. Both soften the cliff edge of missing a day without removing streak pressure entirely.

**Why it works:** The biggest retention drop happens the day after a streak breaks. People quit because the sunk cost is gone. A shield keeps them in the loop.

**Implementation:** One new storage key (`STREAK_SHIELDS`) + a small UI hint on the streak badge. A shield auto-applies when a day is missed; earned back after N qualifying days.

---

### 3. Pet evolution + emotional investment (long-term arc)
**What Finch does:** The bird evolves through egg → toddler → adult → elder, with named relationship milestones ("Twinzies" at day 312). The long arc ensures engagement over months, not just weeks.

**PetBloom already has this** — Pochi's evolution is driven by total sessions. The key is making each evolution feel like a genuine relationship milestone, not just a visual upgrade.

**Psychology:** Endowed progress effect + parasocial relationships.

---

### 4. Variable reward schedule
**What Duolingo does:** XP and leveling vary based on performance. Finch uses randomized adventure outcomes.

**Unpredictable rewards are more engaging than predictable ones** — this is B.F. Skinner's variable ratio reinforcement. Apps with variable rewards see 15–30% higher Day-30 retention.

**For PetBloom:** Could be random "surprise" mood boosts, rare emoji reactions from Pochi after sessions, or occasional bonus XP events.

---

### 5. Milestone celebrations
**How it works:** Visible progress markers at meaningful points (7-day streak, 30-day streak, first evolution) trigger dopamine and identity formation ("I'm someone who does this").

**PetBloom already has** the evolution celebration modal. Extending it to streak milestones (7, 30, 100 days) would be low effort with high emotional impact.

---

### 6. Positive reinforcement without shame
**What Finch does:** Never punishes for missed tasks. Only rewards. Affirmations like "You got this!" keep the tone supportive.

**PetBloom principle:** Pet never dies — only reaches `sick` state. Always recoverable. This is already aligned. Extend this to streak loss: frame it as "Pochi is a little tired today" not "you failed."

---

### 7. Social visibility (longer-term)
**What Duolingo does:** Public leaderboards, shareable streaks. Streaks become identity markers ("I have a 200-day streak").

**For PetBloom:** Shareable evolution cards ("Pochi just reached Legendary!") as a low-friction viral mechanic. No social graph needed — just a shareable image.

---

## Retention benchmarks

| Metric | Industry average | Gamified habit apps |
|---|---|---|
| Day-7 retention | 10–12% | ~15% |
| Day-30 retention | — | 15–30% higher with streaks + emotional investment |

Critical drop-off windows: **Day 3** and **Day 7** — notifications and streak shields have the highest impact at these points.

---

## Recommended build order

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Daily reminder notification ("Pochi misses you") | Low | High — Day-3/7 re-engagement |
| 2 | Streak Shield | Medium | High — prevents post-miss quit |
| 3 | Streak milestone celebrations (7/30/100 days) | Low | Medium — identity formation |
| 4 | Variable surprise rewards from Pochi | Medium | Medium — Day-30 retention |
| 5 | Shareable evolution card | Medium | Viral / acquisition |
| 6 | Cosmetic economy (earn coins → Mochi accessories) | High | Months-long retention |

---

## Sources

- [Finch App — Understanding Streaks](https://help.finchcare.com/hc/en-us/articles/37780736136205-Understanding-Streaks)
- [Why Gamifying Self-Care with a Virtual Pet Works for Finch](https://www.linkedin.com/pulse/why-gamifying-self-care-virtual-pet-works-finch-heather-arbiter-gjkpe)
- [Duolingo's Gamification Secrets: How Streaks & XP Boost Engagement](https://www.orizon.co/blog/duolingos-gamification-secrets)
- [The Psychology Behind Duolingo's Streak Feature](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature)
- [Mobile App Retention: Metrics, Benchmarks, and Proven Strategies](https://www.digia.tech/post/mobile-app-user-retention)
- [The Psychology Behind User Retention in Mobile Games](https://www.blog.udonis.co/mobile-marketing/mobile-games/psychology-behind-user-retention)

# Feed Pet Design — Mochi the Fish

## Concept

The Feed screen has its own separate pet — a fish named **Mochi** (default, renameable).
Mochi is distinct from Pochi (the focus pet) — Pochi grows through focus sessions, Mochi
grows through daily feeding. Two pets, two habits, one app.

Mochi never shrinks, never dies, never regresses. Only grows.

---

## Evolution Thresholds

Evolution is driven by `TOTAL_FEEDS` (lifetime feeds completed). Thresholds are
front-loaded based on habit formation research — 77% of users churn by Day 3, so the
first milestone must land before that cliff.

| Stage | Name | Total Feeds | ~Calendar Day | Rationale |
|---|---|---|---|---|
| 1 | Tiny | 0 | Day 0 | Starting state |
| 2 | Small | 3 | ~Day 3 | First win before the 3-day churn cliff |
| 3 | Medium | 10 | ~Day 10 | Lands in the critical Day 7–10 retention window |
| 4 | Big | 21 | ~Day 21 | Aligns with popular "3-week habit" belief |
| 5 | Large | 50 | ~Day 50 | Past 30-day cliff — user is genuinely retained |
| 6 | Giant | 100 | ~Day 100 | Prestige milestone (Duolingo uses Day 100 too) |

Gap progression (3 → 7 → 11 → 29 → 50) follows a roughly Fibonacci growth — feels
natural, never stalls.

---

## Visual Design

Same 🐟 emoji throughout all stages. Size increases with each evolution:

| Stage | Font Size |
|---|---|
| Tiny | 36 |
| Small | 52 |
| Medium | 68 |
| Big | 84 |
| Large | 100 |
| Giant | 120 |

No new assets needed. The size jump alone makes each evolution feel visually satisfying.

---

## Storage Keys

```typescript
FEED_PET_NAME: 'feedPetName'   // string, default "Mochi" — renameable in future settings
TOTAL_FEEDS:   'totalFeeds'    // number, lifetime feeds completed — drives stage computation
LAST_FED_TIME: 'lastFedTime'   // number (ms timestamp), last completed feed
```

> `FEED_PET_STAGE` is **derived**, not stored. Call `getFeedPetStage(totalFeeds)` from
> `FeedService` at render time — always computed from `TOTAL_FEEDS`, never persisted separately.

---

## Research Basis

- **Duolingo:** Day 7 streak = 3.6× more likely to stay long-term. Milestone structure:
  7 → 30 → 100 → 365 days.
- **Finch app:** Bird evolves at 7 → 27 → 42 → 67 adventure days. First transition at
  Day 7 is deliberate — matches the retention inflection point.
- **Habit formation science:** Median habit formation is 59–66 days (not 21). Front-load
  rewards in Days 1–30 when retention is most fragile.
- **Tamagotchi effect:** Emotional attachment forms through investment (time, consistency),
  not complexity. The fish doesn't need to be elaborate — it needs to feel *yours*.

---

## Design Rules

- **Never regress** — Mochi never shrinks, even if the user misses days.
- **Never die** — consistent with PetPal's "pet never dies" principle.
- **Name is persistent** — stored in `FEED_PET_NAME`, default "Mochi", editable later
  from a settings screen.
- **Evolution celebration** — reuse `EvolutionCelebration` component from Pochi's flow.
- **Progress visible** — always show feeds remaining to next stage so users know the goal.

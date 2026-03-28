export type SessionState = 'idle' | 'active' | 'grace' | 'completed' | 'failed';

export interface FocusStateMachine {
  getState(): SessionState;
  startSession(): void;
  onBackground(): void;
  onForeground(): void;
  timerComplete(): void;
  giveUp(): void;
  dispose(): void;
}

export function createFocusStateMachine(
  onStateChange: (state: SessionState) => void,
  gracePeriodMs = 10_000,
): FocusStateMachine {
  let state: SessionState = 'idle';
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  // Wall-clock timestamp when grace started — lets us check elapsed time when
  // JS timers are throttled in background (Expo Go / low-power mode)
  let graceStartedAt: number | null = null;

  function transition(next: SessionState) {
    state = next;
    onStateChange(next);
  }

  function clearGrace() {
    if (graceTimer !== null) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    graceStartedAt = null;
  }

  return {
    getState() {
      return state;
    },

    startSession() {
      if (state !== 'idle') return;
      transition('active');
    },

    onBackground() {
      if (state !== 'active') return;
      graceStartedAt = Date.now();
      transition('grace');
      graceTimer = setTimeout(() => {
        graceTimer = null;
        graceStartedAt = null;
        transition('failed');
      }, gracePeriodMs);
    },

    onForeground() {
      if (state !== 'grace') return;
      // Check wall-clock elapsed in case the JS timer was throttled while backgrounded
      const elapsed = graceStartedAt !== null ? Date.now() - graceStartedAt : 0;
      clearGrace();
      if (elapsed >= gracePeriodMs) {
        transition('failed');
      } else {
        transition('active');
      }
    },

    timerComplete() {
      if (state !== 'active') return;
      transition('completed');
    },

    giveUp() {
      if (state !== 'active' && state !== 'grace' && state !== 'failed') return;
      clearGrace();
      transition('idle');
    },

    dispose() {
      clearGrace();
    },
  };
}

export type SessionState = 'idle' | 'active' | 'completed';

export interface FocusStateMachine {
  getState(): SessionState;
  startSession(): void;
  timerComplete(): void;
  giveUp(): void;
  dispose(): void;
}

export function createFocusStateMachine(
  onStateChange: (state: SessionState) => void,
): FocusStateMachine {
  let state: SessionState = 'idle';

  function transition(next: SessionState) {
    state = next;
    onStateChange(next);
  }

  return {
    getState() {
      return state;
    },

    startSession() {
      if (state !== 'idle') return;
      transition('active');
    },

    timerComplete() {
      if (state !== 'active') return;
      transition('completed');
    },

    giveUp() {
      if (state !== 'active' && state !== 'completed') return;
      transition('idle');
    },

    dispose() {},
  };
}

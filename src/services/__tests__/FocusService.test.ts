import { createFocusStateMachine, SessionState } from '../FocusService';

describe('FocusService grace period state machine', () => {
  let states: SessionState[];
  let machine: ReturnType<typeof createFocusStateMachine>;

  beforeEach(() => {
    jest.useFakeTimers();
    states = [];
    machine = createFocusStateMachine((s) => states.push(s));
  });

  afterEach(() => {
    machine.dispose();
    jest.useRealTimers();
  });

  // ── Tracer bullet ──────────────────────────────────────────────
  test('initial state is idle', () => {
    expect(machine.getState()).toBe('idle');
  });

  test('startSession transitions to active', () => {
    machine.startSession();
    expect(machine.getState()).toBe('active');
    expect(states).toEqual(['active']);
  });

  test('app going to background starts grace period', () => {
    machine.startSession();
    machine.onBackground();
    expect(machine.getState()).toBe('grace');
  });

  test('grace period expiry (10s) fails the session', () => {
    machine = createFocusStateMachine((s) => states.push(s), 10_000);
    machine.startSession();
    machine.onBackground();
    jest.advanceTimersByTime(10_001);
    expect(machine.getState()).toBe('failed');
  });

  test('returning to foreground within 10s resumes session', () => {
    machine = createFocusStateMachine((s) => states.push(s), 10_000);
    machine.startSession();
    machine.onBackground();
    jest.advanceTimersByTime(5_000);   // 5s — still in grace
    machine.onForeground();
    expect(machine.getState()).toBe('active');
    // grace timer must be cancelled — no 'failed' state after 10s
    jest.advanceTimersByTime(6_000);
    expect(machine.getState()).toBe('active');
  });

  test('timerComplete transitions to completed', () => {
    machine.startSession();
    machine.timerComplete();
    expect(machine.getState()).toBe('completed');
  });

  test('giveUp transitions to idle', () => {
    machine.startSession();
    machine.giveUp();
    expect(machine.getState()).toBe('idle');
  });

  test('background when idle does nothing', () => {
    machine.onBackground();
    expect(machine.getState()).toBe('idle');
    expect(states).toEqual([]);
  });

  test('giveUp from failed state resets to idle', () => {
    machine = createFocusStateMachine((s) => states.push(s), 10_000);
    machine.startSession();
    machine.onBackground();
    jest.advanceTimersByTime(10_001);
    expect(machine.getState()).toBe('failed');
    machine.giveUp();
    expect(machine.getState()).toBe('idle');
  });

  test('giveUp during grace cancels grace timer and returns to idle', () => {
    machine = createFocusStateMachine((s) => states.push(s), 10_000);
    machine.startSession();
    machine.onBackground();
    expect(machine.getState()).toBe('grace');
    machine.giveUp();
    expect(machine.getState()).toBe('idle');
    // Grace timer must be cancelled — no 'failed' after 10s
    jest.advanceTimersByTime(11_000);
    expect(machine.getState()).toBe('idle');
  });
});

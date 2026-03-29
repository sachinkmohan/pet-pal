import { createFocusStateMachine, SessionState } from '../FocusService';

describe('FocusService state machine', () => {
  let states: SessionState[];
  let machine: ReturnType<typeof createFocusStateMachine>;

  beforeEach(() => {
    states = [];
    machine = createFocusStateMachine((s) => states.push(s));
  });

  afterEach(() => {
    machine.dispose();
  });

  test('initial state is idle', () => {
    expect(machine.getState()).toBe('idle');
  });

  test('startSession transitions to active', () => {
    machine.startSession();
    expect(machine.getState()).toBe('active');
    expect(states).toEqual(['active']);
  });

  test('startSession is a no-op when already active', () => {
    machine.startSession();
    machine.startSession();
    expect(states).toEqual(['active']);
  });

  test('timerComplete transitions active to completed', () => {
    machine.startSession();
    machine.timerComplete();
    expect(machine.getState()).toBe('completed');
    expect(states).toEqual(['active', 'completed']);
  });

  test('timerComplete is a no-op when idle', () => {
    machine.timerComplete();
    expect(machine.getState()).toBe('idle');
    expect(states).toEqual([]);
  });

  test('giveUp transitions active to idle', () => {
    machine.startSession();
    machine.giveUp();
    expect(machine.getState()).toBe('idle');
  });

  test('giveUp is a no-op when idle', () => {
    machine.giveUp();
    expect(machine.getState()).toBe('idle');
    expect(states).toEqual([]);
  });

  test('giveUp from completed resets to idle (user chose not to save)', () => {
    machine.startSession();
    machine.timerComplete();
    expect(machine.getState()).toBe('completed');
    machine.giveUp();
    expect(machine.getState()).toBe('idle');
  });
});

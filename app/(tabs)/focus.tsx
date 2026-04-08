import { router, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CircularCountdown } from "@/components/circular-countdown";
import { CircularSlider } from "@/components/circular-slider";
import { DurationPicker } from "@/components/duration-picker";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PetBloomColors } from "@/src/constants/Colors";
import { EVOLUTION_CONFIG, getEvolutionStage } from "@/src/constants/PetStates";
import {
  createFocusStateMachine,
  FocusStateMachine,
  SessionState,
} from "@/src/services/FocusService";
import { calculateMood } from "@/src/services/MoodService";
import {
  cancelPrePhaseNotification,
  cancelSessionNotification,
  showPrePhaseNotification,
  showSessionNotification,
} from "@/src/services/NotificationService";
import { getItem, setItem } from "@/src/storage/AppStorage";
import { STORAGE_KEYS } from "@/src/storage/keys";
import { updateStreakAfterSession } from "@/src/services/StreakService";
import { recordQuestEvent } from "@/src/services/QuestStorage";
import { adjustSessionDuration, calculateTaskCoins, initialTaskPhase, resolveAutoStart } from "@/src/services/TaskService";
import type { TaskSessionContext } from "@/src/services/NotificationService";
import { addRecentDuration } from "@/src/storage/recentDurations";
import { resetDailyDataIfNeeded } from "@/src/storage/seedData";
import { formatDuration } from "@/src/utils/durationPicker";

export default function FocusScreen() {
  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation();

  // Task params (when launched from Tasks screen)
  const params = useLocalSearchParams<{ launchId?: string; taskName?: string; durationSeconds?: string; skipPrePhase?: string }>();
  const launchId = params.launchId ?? null;
  const taskName = params.taskName ?? null;
  const taskDurationSeconds = params.durationSeconds ? parseInt(params.durationSeconds, 10) : null;
  const skipPrePhase = params.skipPrePhase === 'true';
  const isTaskMode = taskName !== null;

  // Pre-phase: 2-minute countdown before the real session (task mode only)
  // 'pre' → 2-min countdown; 'session' → real session
  const [taskPhase, setTaskPhase] = useState<'pre' | 'session'>(initialTaskPhase(skipPrePhase));
  const [activeSessionDuration, setActiveSessionDuration] = useState(taskDurationSeconds ?? 0);

  // Setup state
  const [duration, setDuration] = useState(25);
  const [manualMode, setManualMode] = useState(false);
  const [petEmoji, setPetEmoji] = useState("🥚");
  const [petName, setPetName] = useState("Pochi");
  const [recentDurations, setRecentDurations] = useState<number[]>([]);

  // Session state (driven by FocusStateMachine)
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);

  // Machine ref — single instance per screen mount
  const machineRef = useRef<FocusStateMachine | null>(null);
  const sessionDurationRef = useRef(duration);
  const sessionStartedAtRef = useRef<Date>(new Date());
  const prePhaseEndTimeRef = useRef<number>(0);
  const sessionEndTimeRef = useRef<number>(0);
  const sessionLaunchIdRef = useRef<string | null>(null);
  const launchIdRef = useRef<string | null>(launchId);
  const skipPrePhaseRef = useRef(skipPrePhase);
  const taskPhaseRef = useRef<'pre' | 'session'>('pre');
  const isTaskModeRef = useRef(isTaskMode);
  const taskDurationSecondsRef = useRef(taskDurationSeconds);
  const sessionActive = sessionState === "active";

  // Keep refs in sync with current render values
  taskPhaseRef.current = taskPhase;
  isTaskModeRef.current = isTaskMode;
  taskDurationSecondsRef.current = taskDurationSeconds;
  launchIdRef.current = launchId;
  skipPrePhaseRef.current = skipPrePhase;

  const loadData = useCallback(async () => {
    const [name, totalSessions, recents, manualModeStored] = await Promise.all([
      getItem<string>(STORAGE_KEYS.PET_NAME),
      getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
      getItem<number[]>(STORAGE_KEYS.RECENT_DURATIONS),
      getItem<boolean>(STORAGE_KEYS.MANUAL_DURATION_MODE),
    ]);
    const stage = getEvolutionStage(totalSessions ?? 0);
    setPetEmoji(EVOLUTION_CONFIG[stage].emoji);
    setPetName(name ?? "Pochi");
    setRecentDurations(recents ?? []);
    setManualMode(manualModeStored ?? false);
  }, []);

  async function handleManualModeToggle(value: boolean) {
    setManualMode(value);
    await setItem(STORAGE_KEYS.MANUAL_DURATION_MODE, value);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Re-start task session on re-focus when pre-phase was skipped and machine is idle.
      // Uses refs (launchIdRef, sessionLaunchIdRef, sessionEndTimeRef) to avoid stale
      // closure values — resolveAutoStart encapsulates the decision logic.
      if (isTaskModeRef.current && skipPrePhaseRef.current && machineRef.current?.getState() === 'idle') {
        const taskDur = taskDurationSecondsRef.current;
        if (taskDur !== null) {
          const result = resolveAutoStart(
            launchIdRef.current,
            sessionLaunchIdRef.current,
            sessionEndTimeRef.current,
            taskDur,
            Date.now(),
          );
          if (result.action === 'resume') {
            setActiveSessionDuration(result.seconds);
            handleStart(result.seconds);
          } else if (result.action === 'fresh') {
            setActiveSessionDuration(taskDur);
            handleStart(taskDur);
          }
          // 'none': intentional give-up — user taps Play in Tasks for a new launchId
        } else {
          handleStartOpenFlow();
        }
      }
      return () => {
        machineRef.current?.giveUp();
      };
    }, [loadData]),
  );

  // Reset phase on each new launch (launchId is unique per push, unlike taskName)
  useEffect(() => {
    if (isTaskMode) setTaskPhase(initialTaskPhase(skipPrePhase));
  }, [isTaskMode, launchId]);

  // Fire pre-phase notification and record end time when warm-up starts
  useEffect(() => {
    if (!isTaskMode || taskPhase !== 'pre') return;
    prePhaseEndTimeRef.current = Date.now() + 120_000;
    showPrePhaseNotification(taskDurationSeconds);
  }, [isTaskMode, taskPhase, taskDurationSeconds, launchId]);

  // Hide tab bar during active session OR task pre-phase
  const shouldHideTabBar = sessionActive || (isTaskMode && taskPhase === 'pre');
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: shouldHideTabBar ? { display: "none" } : undefined,
    });
  }, [shouldHideTabBar, navigation]);

  // Create machine once
  useEffect(() => {
    const machine = createFocusStateMachine((state) => {
      setSessionState(state);
      if (state === "completed") {
        cancelSessionNotification();
        setCompletedDuration(sessionDurationRef.current);
        setSessionComplete(true);
      }
    });
    machineRef.current = machine;

    return () => {
      machine.dispose();
      machineRef.current = null;
    };
  }, []);

  // Auto-start session immediately when pre-phase is skipped
  useEffect(() => {
    if (!isTaskMode || !skipPrePhase) return;
    if (taskDurationSeconds !== null) {
      setActiveSessionDuration(taskDurationSeconds);
      handleStart(taskDurationSeconds);
    } else {
      handleStartOpenFlow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount only

  // Auto-transition from pre-phase to session when returning to app after warm-up has elapsed
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        nextState === 'active' &&
        isTaskModeRef.current &&
        taskPhaseRef.current === 'pre' &&
        prePhaseEndTimeRef.current > 0 &&
        Date.now() >= prePhaseEndTimeRef.current
      ) {
        cancelPrePhaseNotification();
        setTaskPhase('session');
        if (taskDurationSecondsRef.current !== null) {
          const overdueMs = Date.now() - prePhaseEndTimeRef.current;
          const adjusted = adjustSessionDuration(taskDurationSecondsRef.current, overdueMs);
          setActiveSessionDuration(adjusted);
          handleStart(adjusted);
        } else {
          handleStartOpenFlow();
        }
      }
    });
    return () => sub.remove();
  }, []);

  function handleStart(overrideSecs?: number) {
    if (!machineRef.current || machineRef.current.getState() !== 'idle') return;
    const totalSecs = overrideSecs ?? duration * 60;
    sessionDurationRef.current = Math.round(totalSecs / 60);
    sessionStartedAtRef.current = new Date();
    sessionEndTimeRef.current = Date.now() + totalSecs * 1000;
    sessionLaunchIdRef.current = launchIdRef.current; // use ref — always current, not stale closure
    // Keep task countdown in sync with the actual session duration being timed.
    // Without this, a give-up → setup-view Start would show the stale previous activeSessionDuration.
    setActiveSessionDuration(totalSecs);
    // Only update the Step Away slider when not in task mode — task sessions
    // must not overwrite the user's manually chosen duration.
    if (overrideSecs !== undefined && !isTaskMode) setDuration(overrideSecs / 60);
    machineRef.current.startSession();
    // Embed task context in notification data so _layout.tsx can navigate back
    // with the same params and preserve isTaskMode on notification tap.
    const taskContext: TaskSessionContext | undefined =
      isTaskMode && launchId && taskName
        ? { launchId, taskName, durationSeconds: taskDurationSeconds ?? 0, skipPrePhase }
        : undefined;
    showSessionNotification(petName, totalSecs, petEmoji, undefined, taskContext);
  }

  function handleGiveUp() {
    // Reset sentinel so the next useFocusEffect callback starts fresh (full duration).
    sessionEndTimeRef.current = 0;
    machineRef.current?.giveUp();
    cancelSessionNotification();
  }

  // Open flow (task with no duration): start machine without a timed countdown
  function handleStartOpenFlow() {
    if (!machineRef.current || machineRef.current.getState() !== 'idle') return;
    sessionStartedAtRef.current = new Date();
    sessionDurationRef.current = 0; // will be set dynamically on end
    machineRef.current.startSession();
    // No notification — end time unknown
  }

  // End open flow: calculate elapsed time then trigger completion
  function handleEndOpenFlow() {
    const elapsedMs = Date.now() - sessionStartedAtRef.current.getTime();
    const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    sessionDurationRef.current = elapsedMinutes;
    machineRef.current?.timerComplete();
  }

  async function saveSessionData(sessionDuration: number) {
    await resetDailyDataIfNeeded();

    const [
      totalSessions,
      sessionsToday,
      focusTimeToday,
      lastFedTime,
      statsEnabled,
      recents,
    ] = await Promise.all([
      getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
      getItem<number>(STORAGE_KEYS.SESSIONS_TODAY),
      getItem<number>(STORAGE_KEYS.FOCUS_TIME_TODAY),
      getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
      getItem<boolean>(STORAGE_KEYS.USAGE_STATS_ENABLED),
      getItem<number[]>(STORAGE_KEYS.RECENT_DURATIONS),
    ]);

    const newTotal = (totalSessions ?? 0) + 1;
    const newSessionsToday = (sessionsToday ?? 0) + 1;
    const newFocusTime = (focusTimeToday ?? 0) + sessionDuration;
    const newRecents = isTaskMode ? (recents ?? []) : addRecentDuration(recents ?? [], sessionDuration);

    await Promise.all([
      setItem(STORAGE_KEYS.TOTAL_SESSIONS_EVER, newTotal),
      setItem(STORAGE_KEYS.SESSIONS_TODAY, newSessionsToday),
      setItem(STORAGE_KEYS.FOCUS_TIME_TODAY, newFocusTime),
      setItem(STORAGE_KEYS.RECENT_DURATIONS, newRecents),
    ]);
    setRecentDurations(newRecents);

    calculateMood({
      sessionsCompleted: newSessionsToday,
      lastFedTime: lastFedTime ?? null,
      screenTimeEnabled: statsEnabled ?? false,
    });

    await updateStreakAfterSession();
    await recordQuestEvent({
      type: 'session',
      durationMinutes: sessionDuration,
      startedAt: sessionStartedAtRef.current,
    });

    const stage = getEvolutionStage(newTotal);
    setPetEmoji(EVOLUTION_CONFIG[stage].emoji);
  }

  async function handleSaveSession() {
    await saveSessionData(completedDuration);
    setSessionComplete(false);
    machineRef.current?.giveUp(); // completed → idle
    if (isTaskMode) router.back();
  }

  function handleDontSave() {
    // User admitted they cheated — discard without recording
    setSessionComplete(false);
    machineRef.current?.giveUp(); // completed → idle
    if (isTaskMode) router.back();
  }

  // Theme-aware colors
  const chipBg = isDark ? PetBloomColors.surfaceDark : PetBloomColors.primaryLight;
  const textMuted = isDark
    ? PetBloomColors.textMutedDark
    : PetBloomColors.textMuted;
  const cardBg = isDark ? PetBloomColors.backgroundDark : PetBloomColors.background;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* ── Task pre-phase: 2-minute starter ── */}
        {isTaskMode && taskPhase === 'pre' ? (
          <View style={styles.sessionContainer}>
            <View style={styles.prePhasHeader}>
              <ThemedText style={[styles.prePhaseLabel, { color: PetBloomColors.primary }]}>
                2-min warm-up
              </ThemedText>
              <ThemedText style={styles.title}>{taskName}</ThemedText>
            </View>

            <CircularCountdown
              key="pre-phase"
              totalSeconds={120}
              onComplete={() => {
                cancelPrePhaseNotification();
                setTaskPhase('session');
                if (taskDurationSeconds !== null) {
                  setActiveSessionDuration(taskDurationSeconds);
                  handleStart(taskDurationSeconds);
                } else {
                  handleStartOpenFlow();
                }
              }}
            />

            {__DEV__ && (
              <Pressable
                style={({ pressed }) => [styles.testButton, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => {
                  cancelPrePhaseNotification();
                  setTaskPhase('session');
                  if (taskDurationSeconds !== null) {
                    setActiveSessionDuration(taskDurationSeconds);
                    handleStart(taskDurationSeconds);
                  } else {
                    handleStartOpenFlow();
                  }
                }}
              >
                <ThemedText style={[styles.testButtonText, { color: textMuted }]}>
                  ⚡ skip warm-up
                </ThemedText>
              </Pressable>
            )}

            <ThemedText style={[styles.prePhaseQuote, { color: textMuted }]}>
              "The resistance you feel right now isn't about the task — it's about the idea of it. Two minutes of doing is all it takes to make it disappear."
            </ThemedText>

            <ThemedText style={[styles.prePhaseNext, { color: textMuted }]}>
              {taskDurationSeconds
                ? `Then your ${formatDuration(Math.round(taskDurationSeconds / 60))} session begins.`
                : 'Then your open session begins.'}
            </ThemedText>
          </View>

        ) : /* ── Task session with duration ── */
        isTaskMode && taskPhase === 'session' && taskDurationSeconds && sessionActive ? (
          <View style={styles.sessionContainer}>
            <ThemedText style={styles.title}>{taskName}</ThemedText>
            <CircularCountdown
              key="task-session"
              totalSeconds={activeSessionDuration}
              onComplete={() => machineRef.current?.timerComplete()}
            />
            <ThemedText style={[styles.sessionHint, { color: textMuted }]}>
              Phone down. {petName} needs you.
            </ThemedText>
            <Pressable
              style={({ pressed }) => [styles.giveUpButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleGiveUp}
            >
              <ThemedText style={[styles.giveUpText, { color: textMuted }]}>Give Up</ThemedText>
            </Pressable>
          </View>

        ) : /* ── Task open flow (no duration) ── */
        isTaskMode && taskPhase === 'session' && !taskDurationSeconds && sessionActive ? (
          <View style={styles.sessionContainer}>
            <ThemedText style={styles.title}>{taskName}</ThemedText>
            <ThemedText style={styles.petEmoji}>{petEmoji}</ThemedText>
            <ThemedText style={[styles.sessionHint, { color: textMuted }]}>
              You're in flow. {petName} is with you. ☁️
            </ThemedText>
            <Pressable
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: PetBloomColors.primary, opacity: pressed ? 0.85 : 1, marginHorizontal: 24 },
              ]}
              onPress={handleEndOpenFlow}
            >
              <ThemedText style={styles.startButtonText}>End Session</ThemedText>
            </Pressable>
          </View>

        ) : /* ── Regular active session ── */
        sessionActive ? (
          <View style={styles.sessionContainer}>
            <ThemedText style={styles.title}>
              You're with {petName} ☁️
            </ThemedText>

            <CircularCountdown
              key="regular-session"
              totalSeconds={duration * 60}
              onComplete={() => machineRef.current?.timerComplete()}
            />

            <ThemedText style={[styles.sessionHint, { color: textMuted }]}>
              Phone down. {petName} needs you.
            </ThemedText>

            <Pressable
              style={({ pressed }) => [
                styles.giveUpButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleGiveUp}
            >
              <ThemedText style={[styles.giveUpText, { color: textMuted }]}>
                Give Up
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          /* ── Setup view ── */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            alwaysBounceVertical={false}
          >
            <ThemedText style={styles.title}>Time with {petName}</ThemedText>

            {/* Mode toggle */}
            <View style={styles.modeToggleRow}>
              <ThemedText style={[styles.modeLabel, { color: textMuted }]}>
                Manual
              </ThemedText>
              <Switch
                value={manualMode}
                onValueChange={handleManualModeToggle}
                trackColor={{ false: PetBloomColors.border, true: PetBloomColors.primary }}
                thumbColor={PetBloomColors.white}
              />
            </View>

            {/* Duration picker */}
            <View style={styles.pickerWrapper}>
              {manualMode ? (
                <DurationPicker value={duration} onChange={setDuration} />
              ) : (
                <CircularSlider value={duration} onChange={setDuration} />
              )}
            </View>

            {recentDurations.length > 0 && (
              <ThemedText style={[styles.recentsLabel, { color: textMuted }]}>
                recent
              </ThemedText>
            )}
            <View style={styles.presets}>
              {recentDurations.map((min) => {
                const isActive = duration === min;
                return (
                  <Pressable
                    key={min}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: isActive
                          ? PetBloomColors.primary
                          : chipBg,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => handleStart(min * 60)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        {
                          color: isActive
                            ? PetBloomColors.white
                            : PetBloomColors.primary,
                        },
                      ]}
                    >
                      {min}m
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.petPreview}>
              <ThemedText style={styles.petEmoji}>{petEmoji}</ThemedText>
              <ThemedText style={[styles.petCaption, { color: textMuted }]}>
                {petName} is waiting for you
              </ThemedText>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.startButton,
                {
                  backgroundColor: PetBloomColors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => handleStart()}
            >
              <ThemedText style={styles.startButtonText}>
                Start — I won't touch my phone!
              </ThemedText>
            </Pressable>

            {__DEV__ && (
              <Pressable
                style={({ pressed }) => [
                  styles.testButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => handleStart(10)}
              >
                <ThemedText
                  style={[styles.testButtonText, { color: textMuted }]}
                >
                  ⚡ 10s test
                </ThemedText>
              </Pressable>
            )}
          </ScrollView>
        )}
      </ThemedView>

      {/* ── Session complete modal ── */}
      <Modal
        visible={sessionComplete}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleDontSave}
      >
        <View style={styles.backdrop}>
          <View style={[styles.celebCard, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.celebEmoji}>{petEmoji}</ThemedText>
            {isTaskMode ? (
              <>
                <ThemedText style={styles.celebHeading}>Session done! 🎯</ThemedText>
                <ThemedText style={[styles.celebSub, { color: textMuted }]}>
                  You focused {completedDuration} min on{'\n'}
                  <ThemedText style={{ fontWeight: '700' }}>{taskName}</ThemedText>
                </ThemedText>
                <ThemedText style={[styles.celebSub, { color: PetBloomColors.primary }]}>
                  Mark it complete to earn {calculateTaskCoins(taskDurationSeconds)} coins 🪙
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.celebHeading}>You showed up! 🎉</ThemedText>
                <ThemedText style={[styles.celebSub, { color: textMuted }]}>
                  {completedDuration} minute{completedDuration !== 1 ? 's' : ''}{' '}
                  with {petName}.{'\n'}
                  {petName} loved every minute.
                </ThemedText>
              </>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: PetBloomColors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSaveSession}
            >
              <ThemedText style={styles.buttonText}>
                Count this time 🌟
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cheatButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleDontSave}
            >
              <ThemedText style={[styles.cheatText, { color: textMuted }]}>
                Don't save — I looked at my phone
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  // Setup view
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: "center",
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    alignSelf: "flex-start",
  },
  modeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 8,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  pickerWrapper: {
    alignItems: "center",
  },
  presets: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  recentsLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    alignSelf: "flex-start",
  },
  petPreview: {
    alignItems: "center",
    gap: 6,
  },
  petEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  petCaption: {
    fontSize: 14,
    fontStyle: "italic",
  },
  startButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  startButtonText: {
    color: PetBloomColors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  testButton: {
    paddingVertical: 8,
  },
  testButtonText: {
    fontSize: 12,
  },
  // Active session view
  sessionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  sessionHint: {
    fontSize: 16,
    textAlign: "center",
  },
  prePhasHeader: {
    alignItems: "center",
    gap: 6,
  },
  prePhaseLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  prePhaseQuote: {
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
  },
  prePhaseNext: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  giveUpButton: {
    position: "absolute",
    bottom: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  giveUpText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  // Completion modal
  backdrop: {
    flex: 1,
    backgroundColor: PetBloomColors.scrim,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  celebCard: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  celebEmoji: {
    fontSize: 80,
    lineHeight: 92,
  },
  celebHeading: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  celebSub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  saveButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: PetBloomColors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  cheatButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cheatText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

import { useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
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
  cancelSessionNotification,
  showSessionNotification,
} from "@/src/services/NotificationService";
import { getItem, setItem } from "@/src/storage/AppStorage";
import { STORAGE_KEYS } from "@/src/storage/keys";
import { updateStreakAfterSession } from "@/src/services/StreakService";
import { recordQuestEvent } from "@/src/services/QuestStorage";
import { addRecentDuration } from "@/src/storage/recentDurations";
import { resetDailyDataIfNeeded } from "@/src/storage/seedData";

export default function FocusScreen() {
  const isDark = useColorScheme() === "dark";
  const navigation = useNavigation();

  // Task params (when launched from Tasks screen)
  const params = useLocalSearchParams<{ taskName?: string; durationSeconds?: string }>();
  const taskName = params.taskName ?? null;
  const taskDurationSeconds = params.durationSeconds ? parseInt(params.durationSeconds, 10) : null;
  const isTaskMode = taskName !== null;

  // Pre-phase: 2-minute countdown before the real session (task mode only)
  // 'pre' → 2-min countdown; 'session' → real session
  const [taskPhase, setTaskPhase] = useState<'pre' | 'session'>('pre');

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
  const sessionActive = sessionState === "active";

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
      return () => {
        machineRef.current?.giveUp();
        cancelSessionNotification();
      };
    }, [loadData]),
  );

  // Reset pre-phase when a new task is pushed (taskName changes)
  useEffect(() => {
    if (isTaskMode) setTaskPhase('pre');
  }, [isTaskMode, taskName]);

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
        // Don't save yet — wait for user to confirm or deny
        // Notification intentionally left in tray — user dismisses manually
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

  function handleStart(overrideSecs?: number) {
    if (sessionState !== "idle" || !machineRef.current) return;
    const totalSecs = overrideSecs ?? duration * 60;
    sessionDurationRef.current = totalSecs / 60;
    sessionStartedAtRef.current = new Date();
    if (overrideSecs !== undefined) setDuration(overrideSecs / 60);
    machineRef.current.startSession();
    showSessionNotification(petName, totalSecs, petEmoji);
  }

  function handleGiveUp() {
    machineRef.current?.giveUp();
    cancelSessionNotification();
  }

  // Open flow (task with no duration): start machine without a timed countdown
  function handleStartOpenFlow() {
    if (sessionState !== "idle" || !machineRef.current) return;
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
    const newRecents = addRecentDuration(recents ?? [], sessionDuration);

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
  }

  function handleDontSave() {
    // User admitted they cheated — discard without recording
    setSessionComplete(false);
    machineRef.current?.giveUp(); // completed → idle
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
            <ThemedText style={styles.title}>{taskName}</ThemedText>
            <ThemedText style={[styles.sessionHint, { color: textMuted }]}>
              Starting in 2 minutes…
            </ThemedText>
            <CircularCountdown
              totalSeconds={120}
              onComplete={() => {
                setTaskPhase('session');
                if (taskDurationSeconds) {
                  handleStart(taskDurationSeconds);
                } else {
                  handleStartOpenFlow();
                }
              }}
            />
            <ThemedText style={[styles.sessionHint, { color: textMuted, fontSize: 13 }]}>
              Just get started. Two minutes, that's all.
            </ThemedText>
          </View>

        ) : /* ── Task session with duration ── */
        isTaskMode && taskPhase === 'session' && taskDurationSeconds && sessionActive ? (
          <View style={styles.sessionContainer}>
            <ThemedText style={styles.title}>{taskName}</ThemedText>
            <CircularCountdown
              totalSeconds={taskDurationSeconds}
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
            <ThemedText style={styles.celebHeading}>
              You showed up! 🎉
            </ThemedText>
            <ThemedText style={[styles.celebSub, { color: textMuted }]}>
              {completedDuration} minute{completedDuration !== 1 ? "s" : ""}{" "}
              with {petName}.{"\n"}
              {petName} loved every minute.
            </ThemedText>

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

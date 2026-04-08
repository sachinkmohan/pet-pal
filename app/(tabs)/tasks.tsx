import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PetBloomColors } from "@/src/constants/Colors";
import {
  buildRolling7Days,
  calculateTaskCoins,
  filterForNewDay,
  processTaskInput,
  shouldCarryOver,
  type Task,
} from "@/src/services/TaskService";
import { getItem, setItem } from "@/src/storage/AppStorage";
import { STORAGE_KEYS } from "@/src/storage/keys";

// ── Onboarding content ────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    icon: "📋",
    title: "Plan your day",
    body: 'Add up to 3 tasks for today. Include a duration like "10m" or "2h 30m" and Pochi will time your session automatically.',
  },
  {
    icon: "⏱",
    title: "Just 2 minutes",
    body: "Procrastination isn't about the task being hard — it's that starting feels like a commitment. Two minutes removes that. It's not a promise to finish. It's just a beginning.",
  },
  {
    icon: "✓",
    title: "Done is done",
    body: "Tap the circle to check off a task when you're done. Tap and hold a task to edit or delete it. Completed tasks are cleared at midnight automatically.",
  },
];

// ── In-flight guard — prevents double coin-award on rapid taps ───────────────
const inFlight = new Set<string>();

// ── Day labels for rolling 7-day bar ─────────────────────────────────────────

function getDayLabels(now: Date): string[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    if (i === 0) {
      labels.push("Today");
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(days[d.getDay()]);
    }
  }
  return labels;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const isDark = useColorScheme() === "dark";
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [inputText, setInputText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [carryOverVisible, setCarryOverVisible] = useState(false);
  const [carryOverIncomplete, setCarryOverIncomplete] = useState<Task[]>([]);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [rolling7, setRolling7] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [editDetectedDuration, setEditDetectedDuration] = useState<
    number | null
  >(null);
  const [coinReward, setCoinReward] = useState<number | null>(null);

  const inputRef = useRef<TextInput>(null);
  const editInputRef = useRef<TextInput>(null);

  // ── Auto-dismiss coin reward pop-up after 1500ms ─────────────────────────────

  useEffect(() => {
    if (coinReward === null) return;
    const id = setTimeout(() => setCoinReward(null), 1500);
    return () => clearTimeout(id);
  }, [coinReward]);

  // ── Load data on focus ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [storedTasks, lastDate, completions, onboardingDone] =
      await Promise.all([
        getItem<Task[]>(STORAGE_KEYS.POCHI_TASKS),
        getItem<string>(STORAGE_KEYS.POCHI_TASKS_LAST_DATE),
        getItem<{ completedAt: string }[]>(STORAGE_KEYS.POCHI_TASK_COMPLETIONS),
        getItem<boolean>(STORAGE_KEYS.POCHI_TASKS_ONBOARDING_DONE),
      ]);

    const now = new Date();

    // Midnight carry-over check
    if (
      shouldCarryOver(lastDate, now.toISOString()) &&
      storedTasks &&
      storedTasks.length > 0
    ) {
      const { incomplete } = filterForNewDay(storedTasks);
      if (incomplete.length > 0) {
        setCarryOverIncomplete(incomplete);
        setCarryOverVisible(true);
        // Completed tasks are always removed — only prompt for incomplete
        return;
      } else {
        // All were completed — silently clear
        await setItem(STORAGE_KEYS.POCHI_TASKS, []);
        await setItem(STORAGE_KEYS.POCHI_TASKS_LAST_DATE, now.toISOString());
        setTasks([]);
      }
    } else {
      setTasks(storedTasks ?? []);
    }

    // Rolling 7-day completions
    const result = buildRolling7Days(completions ?? [], now);
    setRolling7(result);

    // First-time onboarding
    if (!onboardingDone) {
      setOnboardingStep(1);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ── Carry-over handlers ─────────────────────────────────────────────────────

  async function handleKeepThem() {
    const now = new Date();
    // Reset incomplete tasks to unchecked, keep them
    const kept = carryOverIncomplete.map((t) => ({
      ...t,
      completed: false,
      completedAt: null,
    }));
    await setItem(STORAGE_KEYS.POCHI_TASKS, kept);
    await setItem(STORAGE_KEYS.POCHI_TASKS_LAST_DATE, now.toISOString());
    setTasks(kept);

    const completions = await getItem<{ completedAt: string }[]>(
      STORAGE_KEYS.POCHI_TASK_COMPLETIONS,
    );
    setRolling7(buildRolling7Days(completions ?? [], now));
    setCarryOverVisible(false);
  }

  async function handleStartFresh() {
    const now = new Date();
    await setItem(STORAGE_KEYS.POCHI_TASKS, []);
    await setItem(STORAGE_KEYS.POCHI_TASKS_LAST_DATE, now.toISOString());
    setTasks([]);

    const completions = await getItem<{ completedAt: string }[]>(
      STORAGE_KEYS.POCHI_TASK_COMPLETIONS,
    );
    setRolling7(buildRolling7Days(completions ?? [], now));
    setCarryOverVisible(false);
  }

  // ── Input change handlers (strip duration on detect) ─────────────────────────

  function handleInputChange(text: string) {
    const { displayText, durationSeconds } = processTaskInput(
      text,
      detectedDuration,
    );
    setInputText(displayText);
    setDetectedDuration(durationSeconds);
  }

  function handleEditInputChange(text: string) {
    const { displayText, durationSeconds } = processTaskInput(
      text,
      editDetectedDuration,
    );
    setEditText(displayText);
    setEditDetectedDuration(durationSeconds);
  }

  // ── Add task ────────────────────────────────────────────────────────────────

  async function handleAddTask() {
    const name = inputText.trim();
    if (!name || tasks.length >= 3) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const task: Task = {
      id,
      text: detectedDuration
        ? `${name} ${formatDurationBadge(detectedDuration)}`
        : name,
      displayName: name,
      durationSeconds: detectedDuration,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [...tasks, task];
    await setItem(STORAGE_KEYS.POCHI_TASKS, updated);
    await setItem(STORAGE_KEYS.POCHI_TASKS_LAST_DATE, new Date().toISOString());
    setTasks(updated);
    setInputText("");
    setDetectedDuration(null);
    setShowInput(false);
  }

  // ── Toggle check-off (one-way: completing only) ─────────────────────────────

  async function handleToggleComplete(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.completed) return; // tasks are one-way — no unchecking
    if (inFlight.has(taskId)) return;
    inFlight.add(taskId);

    try {
    const now = new Date().toISOString();
    const updated = tasks.map((t) =>
      t.id !== taskId ? t : { ...t, completed: true, completedAt: now },
    );
    setTasks(updated); // optimistic update before first await
    await setItem(STORAGE_KEYS.POCHI_TASKS, updated);

    const completions =
      (await getItem<{ completedAt: string }[]>(
        STORAGE_KEYS.POCHI_TASK_COMPLETIONS,
      )) ?? [];
    const newCompletions = [...completions, { completedAt: now }];
    await setItem(STORAGE_KEYS.POCHI_TASK_COMPLETIONS, newCompletions);
    setRolling7(buildRolling7Days(newCompletions, new Date()));

    // Award coins
    const earned = calculateTaskCoins(task.durationSeconds);
    const currentCoins = await getItem<number>(STORAGE_KEYS.COINS);
    await setItem(STORAGE_KEYS.COINS, (currentCoins ?? 0) + earned);
    setCoinReward(earned);
    } finally {
      inFlight.delete(taskId);
    }
  }

  // ── Delete task ─────────────────────────────────────────────────────────────

  async function handleDelete(taskId: string) {
    const updated = tasks.filter((t) => t.id !== taskId);
    await setItem(STORAGE_KEYS.POCHI_TASKS, updated);
    setTasks(updated);
    setExpandedId(null);
  }

  // ── Edit task ───────────────────────────────────────────────────────────────

  function handleStartEdit(task: Task) {
    setEditingId(task.id);
    setEditText(task.displayName); // pre-fill with stripped name only
    setEditDetectedDuration(task.durationSeconds); // badge pre-filled from stored value
    setExpandedId(null);
    setTimeout(() => editInputRef.current?.focus(), 100);
  }

  async function handleSaveEdit(taskId: string) {
    const name = editText.trim();
    if (!name) return;
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        text: editDetectedDuration
          ? `${name} ${formatDurationBadge(editDetectedDuration)}`
          : name,
        displayName: name,
        durationSeconds: editDetectedDuration,
      };
    });
    await setItem(STORAGE_KEYS.POCHI_TASKS, updated);
    setTasks(updated);
    setEditingId(null);
    setEditText("");
    setEditDetectedDuration(null);
  }

  // ── Play task ───────────────────────────────────────────────────────────────

  function handlePlay(task: Task) {
    function launch(skipPrePhase: boolean) {
      const params: Record<string, string> = {
        taskName: task.displayName,
        skipPrePhase: String(skipPrePhase),
      };
      if (task.durationSeconds !== null) {
        params.durationSeconds = String(task.durationSeconds);
      }
      router.push({ pathname: "/(tabs)/focus", params });
    }

    Alert.alert(
      task.displayName,
      'How do you want to start?',
      [
        { text: 'Start now', onPress: () => launch(true) },
        { text: '2-min warmup', onPress: () => launch(false) },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  // ── Tap task row ────────────────────────────────────────────────────────────

  function handleRowPress(taskId: string) {
    if (editingId === taskId) return; // ignore while editing
    setExpandedId((prev) => (prev === taskId ? null : taskId));
  }

  // ── Onboarding ──────────────────────────────────────────────────────────────

  async function handleOnboardingNext() {
    if (onboardingStep === null) return;
    if (onboardingStep < 3) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setOnboardingStep(null);
      await setItem(STORAGE_KEYS.POCHI_TASKS_ONBOARDING_DONE, true);
    }
  }

  // ── Theme ───────────────────────────────────────────────────────────────────

  const textMuted = isDark
    ? PetBloomColors.textMutedDark
    : PetBloomColors.textMuted;
  const cardBg = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;
  const borderColor = isDark
    ? PetBloomColors.borderDark
    : PetBloomColors.border;
  const inputBg = isDark
    ? PetBloomColors.backgroundDark
    : PetBloomColors.background;

  // ── Day labels for rolling bar ───────────────────────────────────────────────

  const dayLabels = getDayLabels(new Date());
  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Today's 3 Tasks</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.helpBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => setOnboardingStep(1)}
          >
            <ThemedText
              style={[styles.helpBtnText, { color: PetBloomColors.primary }]}
            >
              ?
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          alwaysBounceVertical={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Task list ── */}
          {tasks.map((task) => {
            const isExpanded = expandedId === task.id;
            const isEditing = editingId === task.id;

            return (
              <View key={task.id}>
                {/* Task row */}
                <Pressable
                  style={[styles.taskRow, { borderColor }]}
                  onPress={() => handleRowPress(task.id)}
                >
                  {/* Checkbox */}
                  <Pressable
                    style={[
                      styles.checkbox,
                      {
                        borderColor: task.completed
                          ? PetBloomColors.primary
                          : borderColor,
                      },
                      task.completed && {
                        backgroundColor: PetBloomColors.primary,
                      },
                    ]}
                    onPress={() => handleToggleComplete(task.id)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: task.completed }}
                    accessibilityLabel={`Mark ${task.displayName} complete`}
                  >
                    {task.completed && (
                      <ThemedText style={styles.checkmark}>✓</ThemedText>
                    )}
                  </Pressable>

                  {/* Task name / edit input */}
                  {isEditing ? (
                    <View style={styles.editInputWrap}>
                      <TextInput
                        ref={editInputRef}
                        style={[
                          styles.editInput,
                          {
                            color: isDark
                              ? PetBloomColors.textDark
                              : PetBloomColors.text,
                            backgroundColor: inputBg,
                          },
                        ]}
                        value={editText}
                        onChangeText={handleEditInputChange}
                        onSubmitEditing={() => handleSaveEdit(task.id)}
                        returnKeyType="done"
                        autoCorrect={false}
                      />
                      {editDetectedDuration !== null && (
                        <Pressable
                          style={styles.durationBadge}
                          onPress={() => setEditDetectedDuration(null)}
                          hitSlop={6}
                        >
                          <ThemedText style={styles.durationBadgeText}>
                            {formatDurationBadge(editDetectedDuration)} ×
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View style={styles.taskNameWrap}>
                      <ThemedText
                        style={[
                          styles.taskName,
                          task.completed && styles.taskNameCompleted,
                          task.completed && { color: textMuted },
                        ]}
                        numberOfLines={2}
                      >
                        {task.displayName}
                      </ThemedText>
                      {task.durationSeconds !== null && !task.completed && (
                        <View style={[styles.durationBadge, { marginLeft: 6 }]}>
                          <ThemedText style={styles.durationBadgeText}>
                            {formatDurationBadge(task.durationSeconds)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Play button (hidden on completed / editing) */}
                  {!task.completed && !isEditing && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.playBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handlePlay(task)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${task.displayName}`}
                    >
                      <ThemedText
                        style={[
                          styles.playBtnText,
                          { color: PetBloomColors.primary },
                        ]}
                      >
                        ▶
                      </ThemedText>
                    </Pressable>
                  )}

                  {/* Save edit button */}
                  {isEditing && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.playBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handleSaveEdit(task.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Save edit for ${task.displayName}`}
                    >
                      <ThemedText
                        style={[
                          styles.playBtnText,
                          { color: PetBloomColors.primary },
                        ]}
                      >
                        ✓
                      </ThemedText>
                    </Pressable>
                  )}
                </Pressable>

                {/* Expanded: Edit / Delete */}
                {isExpanded && !isEditing && (
                  <View style={[styles.expandedRow, { borderColor }]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.expandedBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handleStartEdit(task)}
                    >
                      <ThemedText
                        style={[
                          styles.expandedBtnText,
                          { color: PetBloomColors.primary },
                        ]}
                      >
                        Edit
                      </ThemedText>
                    </Pressable>
                    <View
                      style={[
                        styles.expandedDivider,
                        { backgroundColor: borderColor },
                      ]}
                    />
                    <Pressable
                      style={({ pressed }) => [
                        styles.expandedBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handleDelete(task.id)}
                    >
                      <ThemedText
                        style={[
                          styles.expandedBtnText,
                          { color: PetBloomColors.sick },
                        ]}
                      >
                        Delete
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* ── Add task input ── */}
          {showInput && tasks.length < 3 && (
            <View style={[styles.inputRow, { borderColor }]}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.taskInput,
                  {
                    color: isDark
                      ? PetBloomColors.textDark
                      : PetBloomColors.text,
                  },
                ]}
                value={inputText}
                onChangeText={handleInputChange}
                placeholder='Task name… or "Review PR 10m"'
                placeholderTextColor={textMuted}
                onSubmitEditing={handleAddTask}
                returnKeyType="done"
                autoFocus
                autoCorrect={false}
              />
              {detectedDuration !== null && (
                <Pressable
                  style={styles.durationBadge}
                  onPress={() => setDetectedDuration(null)}
                  hitSlop={6}
                >
                  <ThemedText style={styles.durationBadgeText}>
                    {formatDurationBadge(detectedDuration)} ×
                  </ThemedText>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  styles.addConfirmBtn,
                  {
                    backgroundColor: PetBloomColors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={handleAddTask}
              >
                <ThemedText style={styles.addConfirmText}>Add</ThemedText>
              </Pressable>
            </View>
          )}

          {/* ── Add Task button ── */}
          {!showInput && tasks.length < 3 && (
            <Pressable
              style={({ pressed }) => [
                styles.addTaskBtn,
                {
                  borderColor: PetBloomColors.primary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => {
                setInputText("");
                setDetectedDuration(null);
                setShowInput(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
            >
              <ThemedText
                style={[styles.addTaskText, { color: PetBloomColors.primary }]}
              >
                + Add Task
              </ThemedText>
            </Pressable>
          )}

          {/* ── Rolling 7-day stats ── */}
          <View style={[styles.statsSection, { borderColor }]}>
            <View style={styles.statsHeader}>
              <ThemedText style={[styles.statsTitle, { color: textMuted }]}>
                LAST 7 DAYS
              </ThemedText>
              <ThemedText
                style={[styles.weekTotal, { color: PetBloomColors.primary }]}
              >
                {rolling7.reduce((a, b) => a + b, 0)} completed
              </ThemedText>
            </View>
            <View style={styles.numberRow}>
              {rolling7.map((count, i) => (
                <View key={i} style={styles.dayCol}>
                  <ThemedText
                    style={[
                      styles.dayCount,
                      { color: count > 0 ? PetBloomColors.primary : textMuted },
                      i === 6 && count > 0 && styles.dayCountToday,
                    ]}
                  >
                    {count > 0 ? count : "—"}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.dayLabel,
                      { color: textMuted },
                      i === 6 && styles.dayLabelToday,
                    ]}
                  >
                    {dayLabels[i]}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </ThemedView>

      {/* ── Carry-over prompt ── */}
      <Modal
        visible={carryOverVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.promptCard,
              {
                backgroundColor: isDark
                  ? PetBloomColors.backgroundDark
                  : PetBloomColors.background,
              },
            ]}
          >
            <ThemedText style={styles.promptTitle}>
              Tasks from yesterday
            </ThemedText>
            <ThemedText style={[styles.promptBody, { color: textMuted }]}>
              You have {carryOverIncomplete.length} unfinished task
              {carryOverIncomplete.length !== 1 ? "s" : ""}. Keep them or start
              fresh?
            </ThemedText>
            <Pressable
              style={({ pressed }) => [
                styles.promptPrimaryBtn,
                {
                  backgroundColor: PetBloomColors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleKeepThem}
            >
              <ThemedText style={styles.promptPrimaryText}>
                Keep Them
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.promptSecondaryBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleStartFresh}
            >
              <ThemedText
                style={[styles.promptSecondaryText, { color: textMuted }]}
              >
                Start Fresh
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Coin reward pop-up ── */}
      <Modal visible={coinReward !== null} transparent animationType="fade">
        <View style={styles.coinBackdrop}>
          <View style={[styles.coinCard, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.coinEmoji}>🪙</ThemedText>
            <ThemedText style={styles.coinAmount}>+{coinReward}</ThemedText>
            <ThemedText style={[styles.coinLabel, { color: textMuted }]}>
              Task complete!
            </ThemedText>
          </View>
        </View>
      </Modal>

      {/* ── Onboarding overlay ── */}
      <Modal
        visible={onboardingStep !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.onboardingCard,
              {
                backgroundColor: isDark
                  ? PetBloomColors.backgroundDark
                  : PetBloomColors.background,
              },
            ]}
          >
            {onboardingStep !== null && (
              <>
                <ThemedText style={styles.onboardingIcon}>
                  {ONBOARDING_STEPS[onboardingStep - 1].icon}
                </ThemedText>
                <ThemedText style={styles.onboardingTitle}>
                  {ONBOARDING_STEPS[onboardingStep - 1].title}
                </ThemedText>
                <ThemedText
                  style={[styles.onboardingBody, { color: textMuted }]}
                >
                  {ONBOARDING_STEPS[onboardingStep - 1].body}
                </ThemedText>

                {/* Dots */}
                <View style={styles.dots}>
                  {[1, 2, 3].map((n) => (
                    <View
                      key={n}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            n === onboardingStep
                              ? PetBloomColors.primary
                              : PetBloomColors.border,
                        },
                      ]}
                    />
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.onboardingBtn,
                    {
                      backgroundColor: PetBloomColors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={handleOnboardingNext}
                >
                  <ThemedText style={styles.onboardingBtnText}>
                    {onboardingStep < 3 ? "Next" : "Got it"}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDurationBadge(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: "700" },
  helpBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: PetBloomColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  helpBtnText: { fontSize: 16, fontWeight: "700" },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 10,
  },
  // Task rows
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: PetBloomColors.white, fontSize: 12, fontWeight: "700" },
  taskNameWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  taskName: { fontSize: 15, fontWeight: "500" },
  taskNameCompleted: { textDecorationLine: "line-through" },
  playBtn: { paddingHorizontal: 6 },
  playBtnText: { fontSize: 16 },
  expandedRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: "hidden",
    marginTop: -4,
  },
  expandedBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  expandedBtnText: { fontSize: 14, fontWeight: "600" },
  expandedDivider: { width: 1 },
  // Edit input
  editInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  // New task input
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  taskInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  addConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addConfirmText: {
    color: PetBloomColors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  // Duration badge
  durationBadge: {
    backgroundColor: PetBloomColors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationBadgeText: {
    color: PetBloomColors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  // Add task button
  addTaskBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  addTaskText: { fontSize: 15, fontWeight: "600" },
  // Rolling 7-day stats
  statsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    paddingTop: 14,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  weekTotal: {
    fontSize: 13,
    fontWeight: "700",
  },
  numberRow: {
    flexDirection: "row",
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  dayCount: {
    fontSize: 15,
    fontWeight: "600",
  },
  dayCountToday: {
    fontSize: 18,
    fontWeight: "800",
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: "500",
  },
  dayLabelToday: {
    fontWeight: "700",
  },
  // Modals
  backdrop: {
    flex: 1,
    backgroundColor: PetBloomColors.scrim,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  promptCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    gap: 12,
    alignItems: "center",
  },
  promptTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  promptBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  promptPrimaryBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  promptPrimaryText: {
    color: PetBloomColors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  promptSecondaryBtn: { paddingVertical: 8 },
  promptSecondaryText: { fontSize: 14, textDecorationLine: "underline" },
  onboardingCard: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  onboardingIcon: { fontSize: 48, lineHeight: 56 },
  onboardingTitle: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  onboardingBody: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  dots: { flexDirection: "row", gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onboardingBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  onboardingBtnText: {
    color: PetBloomColors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  // Coin reward pop-up
  coinBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinCard: {
    width: 200,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  coinEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  coinAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  coinLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});

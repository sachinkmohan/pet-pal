import { useFocusEffect } from 'expo-router';
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularCountdown } from '@/components/circular-countdown';
import { CircularSlider } from '@/components/circular-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetPalColors } from '@/src/constants/Colors';
import { EVOLUTION_CONFIG, getEvolutionStage } from '@/src/constants/PetStates';
import { calculateMood } from '@/src/services/MoodService';
import { showSessionNotification, cancelSessionNotification } from '@/src/services/NotificationService';
import { createFocusStateMachine, FocusStateMachine, SessionState } from '@/src/services/FocusService';
import { getItem, setItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';
import { resetDailyDataIfNeeded } from '@/src/storage/seedData';

const PRESETS = [5, 15, 30, 60] as const;

export default function FocusScreen() {
  const isDark = useColorScheme() === 'dark';
  const navigation = useNavigation();

  // Setup state
  const [duration, setDuration] = useState(25);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [petEmoji, setPetEmoji] = useState('🥚');
  const [petName, setPetName] = useState('Pochi');

  // Session state (driven by FocusStateMachine)
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);

  // Machine ref — single instance per screen mount
  const machineRef = useRef<FocusStateMachine | null>(null);
  // Capture duration at session start so complete handler uses the right value
  const sessionDurationRef = useRef(duration);

  const sessionActive = sessionState === 'active';

  const loadData = useCallback(async () => {
    const [name, totalSessions] = await Promise.all([
      getItem<string>(STORAGE_KEYS.PET_NAME),
      getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
    ]);
    const stage = getEvolutionStage(totalSessions ?? 0);
    setPetEmoji(EVOLUTION_CONFIG[stage].emoji);
    setPetName(name ?? 'Pochi');
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    return () => {
      machineRef.current?.giveUp();
    };
  }, [loadData]));

  // Hide tab bar during active session
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: sessionActive ? { display: 'none' } : undefined,
    });
  }, [sessionActive, navigation]);

  // Create machine once
  useEffect(() => {
    const machine = createFocusStateMachine((state) => {
      setSessionState(state);
      if (state === 'completed') {
        // Don't save yet — wait for user to confirm or deny
        setCompletedDuration(sessionDurationRef.current);
        setSessionComplete(true);
        cancelSessionNotification();
      }
    });
    machineRef.current = machine;

    return () => {
      machine.dispose();
      machineRef.current = null;
    };
  }, []);

  function handleStart() {
    sessionDurationRef.current = duration;
    machineRef.current?.startSession();
    showSessionNotification(petName, duration * 60);
  }

  function handleGiveUp() {
    machineRef.current?.giveUp();
    cancelSessionNotification();
  }

  async function saveSessionData(sessionDuration: number) {
    await resetDailyDataIfNeeded();

    const [totalSessions, sessionsToday, focusTimeToday, lastFedTime, statsEnabled] =
      await Promise.all([
        getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
        getItem<number>(STORAGE_KEYS.SESSIONS_TODAY),
        getItem<number>(STORAGE_KEYS.FOCUS_TIME_TODAY),
        getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
        getItem<boolean>(STORAGE_KEYS.USAGE_STATS_ENABLED),
      ]);

    const newTotal = (totalSessions ?? 0) + 1;
    const newSessionsToday = (sessionsToday ?? 0) + 1;
    const newFocusTime = (focusTimeToday ?? 0) + sessionDuration;

    await Promise.all([
      setItem(STORAGE_KEYS.TOTAL_SESSIONS_EVER, newTotal),
      setItem(STORAGE_KEYS.SESSIONS_TODAY, newSessionsToday),
      setItem(STORAGE_KEYS.FOCUS_TIME_TODAY, newFocusTime),
    ]);

    calculateMood({
      sessionsCompleted: newSessionsToday,
      lastFedTime: lastFedTime ?? null,
      screenTimeEnabled: statsEnabled ?? false,
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
  const chipBg = isDark ? PetPalColors.surfaceDark : PetPalColors.primaryLight;
  const toggleBg = isDark ? PetPalColors.surfaceDark : PetPalColors.surface;
  const textMuted = isDark ? PetPalColors.textMutedDark : PetPalColors.textMuted;
  const cardBg = isDark ? PetPalColors.backgroundDark : PetPalColors.background;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* ── Active session view ── */}
        {sessionActive ? (
          <View style={styles.sessionContainer}>
            <ThemedText style={styles.title}>Stay focused!</ThemedText>

            <CircularCountdown
              totalSeconds={duration * 60}
              onComplete={() => machineRef.current?.timerComplete()}
            />

            <ThemedText style={[styles.sessionHint, { color: textMuted }]}>
              {petName} is cheering you on {petEmoji}
            </ThemedText>

            <Pressable
              style={({ pressed }) => [
                styles.giveUpButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleGiveUp}
            >
              <ThemedText style={[styles.giveUpText, { color: textMuted }]}>
                Give up
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
            <ThemedText style={styles.title}>Focus Session</ThemedText>

            <View style={styles.sliderWrapper}>
              <CircularSlider value={duration} onChange={setDuration} />
            </View>

            <View style={styles.presets}>
              {PRESETS.map((min) => {
                const isActive = duration === min;
                return (
                  <Pressable
                    key={min}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: isActive ? PetPalColors.primary : chipBg,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => setDuration(min)}
                  >
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: isActive ? PetPalColors.white : PetPalColors.primary },
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
                {petName} is ready to focus!
              </ThemedText>
            </View>

            <Pressable
              style={[styles.musicRow, { backgroundColor: toggleBg }]}
              onPress={() => setMusicEnabled((prev) => !prev)}
            >
              <ThemedText style={styles.musicIcon}>🌧️</ThemedText>
              <View style={styles.musicLabelGroup}>
                <ThemedText style={styles.musicLabel}>Rain sounds</ThemedText>
                <ThemedText style={[styles.musicSub, { color: textMuted }]}>
                  Plays during session
                </ThemedText>
              </View>
              <View
                style={[
                  styles.togglePill,
                  { backgroundColor: musicEnabled ? PetPalColors.primary : PetPalColors.border },
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    { transform: [{ translateX: musicEnabled ? 18 : 2 }] },
                  ]}
                />
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: PetPalColors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleStart}
            >
              <ThemedText style={styles.startButtonText}>
                Start — I won't touch my phone!
              </ThemedText>
            </Pressable>
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
            <ThemedText style={styles.celebHeading}>Session complete!</ThemedText>
            <ThemedText style={[styles.celebSub, { color: textMuted }]}>
              You focused for {completedDuration} minute{completedDuration !== 1 ? 's' : ''}.
              {'\n'}{petName} is so proud of you!
            </ThemedText>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: PetPalColors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleSaveSession}
            >
              <ThemedText style={styles.buttonText}>Save session 🌟</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.cheatButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleDontSave}
            >
              <ThemedText style={[styles.cheatText, { color: textMuted }]}>
                Don't save — I cheated
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
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  sliderWrapper: {
    alignItems: 'center',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  petPreview: {
    alignItems: 'center',
    gap: 6,
  },
  petEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  petCaption: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  musicIcon: {
    fontSize: 28,
  },
  musicLabelGroup: {
    flex: 1,
    gap: 2,
  },
  musicLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  musicSub: {
    fontSize: 12,
  },
  togglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PetPalColors.white,
  },
  startButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: PetPalColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // Active session view
  sessionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  sessionHint: {
    fontSize: 16,
    textAlign: 'center',
  },
  giveUpButton: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  giveUpText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Completion modal
  backdrop: {
    flex: 1,
    backgroundColor: PetPalColors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  celebCard: {
    width: '100%',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  celebEmoji: {
    fontSize: 80,
    lineHeight: 92,
  },
  celebHeading: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  celebSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  saveButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: PetPalColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cheatButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cheatText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetPalColors } from '@/src/constants/Colors';
import {
  EVOLUTION_CONFIG,
  MOOD_CONFIG,
  MoodState,
  getEvolutionStage,
  getNextEvolutionStage,
  sessionsToNextEvolution,
} from '@/src/constants/PetStates';
import { getItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

const FEED_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 hours

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function deriveMood(sessionsToday: number, isFedToday: boolean): MoodState {
  if (sessionsToday >= 2 && isFedToday) return 'thriving';
  if (sessionsToday >= 1 && isFedToday) return 'happy';
  if (isFedToday || sessionsToday >= 1) return 'okay';
  return 'tired';
}

function pickDailyMessage(mood: MoodState): string {
  const messages = MOOD_CONFIG[mood].messages;
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [petName, setPetName] = useState('Pochi');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [focusTimeToday, setFocusTimeToday] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [totalSessionsEver, setTotalSessionsEver] = useState(0);
  const [lastFedTime, setLastFedTime] = useState<number | null>(null);
  const [dailyMessage, setDailyMessage] = useState('');

  const loadData = useCallback(async () => {
    const [name, streak, sessToday, focusTime, pb, totalSessions, fedTime] =
      await Promise.all([
        getItem<string>(STORAGE_KEYS.PET_NAME),
        getItem<number>(STORAGE_KEYS.CURRENT_STREAK),
        getItem<number>(STORAGE_KEYS.SESSIONS_TODAY),
        getItem<number>(STORAGE_KEYS.FOCUS_TIME_TODAY),
        getItem<number>(STORAGE_KEYS.PERSONAL_BEST),
        getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
        getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
      ]);

    const sessions = sessToday ?? 0;
    const isFed = fedTime !== null && Date.now() - fedTime < FEED_COOLDOWN_MS;
    const mood = deriveMood(sessions, isFed);

    setPetName(name ?? 'Pochi');
    setCurrentStreak(streak ?? 0);
    setSessionsToday(sessions);
    setFocusTimeToday(focusTime ?? 0);
    setPersonalBest(pb ?? 0);
    setTotalSessionsEver(totalSessions ?? 0);
    setLastFedTime(fedTime);
    setDailyMessage(pickDailyMessage(mood));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Derived values
  const evolutionStage = getEvolutionStage(totalSessionsEver);
  const petEmoji = EVOLUTION_CONFIG[evolutionStage].emoji;
  const isFedToday = lastFedTime !== null && Date.now() - lastFedTime < FEED_COOLDOWN_MS;
  const feedAvailable = lastFedTime === null || Date.now() - lastFedTime >= FEED_COOLDOWN_MS;
  const mood = deriveMood(sessionsToday, isFedToday);
  const moodConfig = MOOD_CONFIG[mood];

  // XP progress bar
  const nextStageSessionsLeft = sessionsToNextEvolution(totalSessionsEver, evolutionStage);
  const currentStageMin = EVOLUTION_CONFIG[evolutionStage].sessionsRequired;
  const nextStage = getNextEvolutionStage(evolutionStage);
  const nextStageMin = nextStage ? EVOLUTION_CONFIG[nextStage].sessionsRequired : null;
  const xpProgress = nextStageMin !== null
    ? (totalSessionsEver - currentStageMin) / (nextStageMin - currentStageMin)
    : 1;

  // Theme-aware colors
  const surface = isDark ? PetPalColors.surfaceDark : PetPalColors.surface;
  const border = isDark ? PetPalColors.borderDark : PetPalColors.border;
  const textMuted = isDark ? PetPalColors.textMutedDark : PetPalColors.textMuted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header: Greeting + Date */}
          <View style={styles.header}>
            <ThemedText style={styles.greeting}>
              {getGreeting()}, {petName}!
            </ThemedText>
            <ThemedText style={[styles.date, { color: textMuted }]}>
              {getFormattedDate()}
            </ThemedText>
          </View>

          {/* Streak Badge */}
          <View style={[styles.streakBadge, { backgroundColor: PetPalColors.primaryLight }]}>
            <ThemedText style={[styles.streakText, { color: PetPalColors.streak }]}>
              🔥 {currentStreak} day streak
            </ThemedText>
          </View>

          {/* Pet Area */}
          <View style={styles.petArea}>
            <ThemedText style={styles.petEmoji}>{petEmoji}</ThemedText>
            <ThemedText style={styles.petName}>{petName}</ThemedText>
            <ThemedText style={[styles.moodLabel, { color: PetPalColors[mood] }]}>
              {moodConfig.emoji} {moodConfig.label}
            </ThemedText>
            {dailyMessage !== '' && (
              <ThemedText style={[styles.dailyMessage, { color: textMuted }]}>
                &ldquo;{dailyMessage}&rdquo;
              </ThemedText>
            )}
          </View>

          {/* XP Progress Bar */}
          {nextStageSessionsLeft !== null && (
            <View style={styles.xpSection}>
              <View style={styles.xpLabelRow}>
                <ThemedText style={styles.xpLabel}>XP Progress</ThemedText>
                <ThemedText style={[styles.xpSubLabel, { color: textMuted }]}>
                  {nextStageSessionsLeft} sessions to evolve
                </ThemedText>
              </View>
              <View style={[styles.xpBarBg, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <View
                  style={[
                    styles.xpBarFill,
                    {
                      backgroundColor: PetPalColors.primary,
                      width: `${Math.min(xpProgress * 100, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: PetPalColors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push('/(tabs)/focus')}
            >
              <ThemedText style={styles.buttonText}>🎯 Start Focus Session</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: PetPalColors.accent, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push('/feed')}
            >
              <View style={styles.feedButtonInner}>
                <ThemedText style={styles.buttonText}>🍎 Feed {petName}</ThemedText>
                {feedAvailable && <View style={styles.feedDot} />}
              </View>
            </Pressable>
          </View>

          {/* Today's Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: surface }]}>
            <View style={styles.stat}>
              <ThemedText style={[styles.statValue, { color: PetPalColors.focusBar }]}>
                {focusTimeToday}m
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textMuted }]}>
                Focus today
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: border }]} />
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>{sessionsToday}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: textMuted }]}>
                Sessions
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: border }]} />
            <View style={styles.stat}>
              <ThemedText style={[styles.statValue, { color: PetPalColors.thriving }]}>
                {personalBest}m
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textMuted }]}>
                Personal best
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </ThemedView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    gap: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
  },
  date: {
    fontSize: 14,
  },
  streakBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700',
  },
  petArea: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  petEmoji: {
    fontSize: 96,
    lineHeight: 110,
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dailyMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  xpSection: {
    gap: 8,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  xpSubLabel: {
    fontSize: 13,
  },
  xpBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  buttons: {
    gap: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: PetPalColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  feedButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PetPalColors.white,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
});

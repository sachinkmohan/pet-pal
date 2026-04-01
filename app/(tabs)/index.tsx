import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EvolutionCelebration } from "@/components/evolution-celebration";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { XpProgressBar } from "@/components/xp-progress-bar";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PetBloomColors } from "@/src/constants/Colors";
import {
  EVOLUTION_CONFIG,
  EVOLUTION_ORDER,
  EvolutionStage,
  MOOD_CONFIG,
  MoodState,
  getEvolutionStage,
} from "@/src/constants/PetStates";
import { FEED_COOLDOWN_MS, calculateMood } from "@/src/services/MoodService";
import { formatDuration } from "@/src/utils/durationPicker";
import { getItem, setItem } from "@/src/storage/AppStorage";
import { STORAGE_KEYS } from "@/src/storage/keys";
import { getCoins } from "@/src/services/QuestStorage";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function pickDailyMessage(mood: MoodState): string {
  const messages = MOOD_CONFIG[mood].messages;
  return messages[Math.floor(Math.random() * messages.length)];
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [petName, setPetName] = useState("Pochi");
  const [fishName, setFishName] = useState("Mochi");
  const [currentStreak, setCurrentStreak] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [focusTimeToday, setFocusTimeToday] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [totalSessionsEver, setTotalSessionsEver] = useState(0);
  const [lastFedTime, setLastFedTime] = useState<number | null>(null);
  const [usageStatsEnabled, setUsageStatsEnabled] = useState(false);
  const [dailyMessage, setDailyMessage] = useState("");
  const [celebrationStage, setCelebrationStage] =
    useState<EvolutionStage | null>(null);
  const [coins, setCoins] = useState(0);

  const loadData = useCallback(async () => {
    const [
      name,
      feedName,
      streak,
      sessToday,
      focusTime,
      pb,
      totalSessions,
      fedTime,
      statsEnabled,
      storedStage,
    ] = await Promise.all([
      getItem<string>(STORAGE_KEYS.PET_NAME),
      getItem<string>(STORAGE_KEYS.FEED_PET_NAME),
      getItem<number>(STORAGE_KEYS.CURRENT_STREAK),
      getItem<number>(STORAGE_KEYS.SESSIONS_TODAY),
      getItem<number>(STORAGE_KEYS.FOCUS_TIME_TODAY),
      getItem<number>(STORAGE_KEYS.PERSONAL_BEST),
      getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
      getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
      getItem<boolean>(STORAGE_KEYS.USAGE_STATS_ENABLED),
      getItem<string>(STORAGE_KEYS.EVOLUTION_STAGE),
    ]);
    const coinBalance = await getCoins();

    const total = totalSessions ?? 0;
    const sessions = sessToday ?? 0;
    const mood = calculateMood({
      sessionsCompleted: sessions,
      lastFedTime: fedTime,
      screenTimeEnabled: statsEnabled ?? false,
    });

    // Detect evolution: only trigger celebration when stage advances forward.
    // Validate storedStage is a known EvolutionStage before comparing —
    // a corrupt/unknown value must not cause an infinite retrigger loop.
    const computedStage = getEvolutionStage(total);
    const isKnownStage =
      storedStage !== null &&
      (EVOLUTION_ORDER as string[]).includes(storedStage);
    if (isKnownStage) {
      const storedIndex = (EVOLUTION_ORDER as string[]).indexOf(storedStage);
      const computedIndex = (EVOLUTION_ORDER as string[]).indexOf(
        computedStage,
      );
      if (computedIndex > storedIndex) {
        setCelebrationStage(computedStage);
      }
    }

    setPetName(name ?? "Pochi");
    setFishName(feedName ?? "Mochi");
    setCurrentStreak(streak ?? 0);
    setSessionsToday(sessions);
    setFocusTimeToday(focusTime ?? 0);
    setPersonalBest(pb ?? 0);
    setTotalSessionsEver(total);
    setLastFedTime(fedTime);
    setUsageStatsEnabled(statsEnabled ?? false);
    setDailyMessage(pickDailyMessage(mood));
    setCoins(coinBalance);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleEvolutionDismiss() {
    if (celebrationStage) {
      try {
        await setItem(STORAGE_KEYS.EVOLUTION_STAGE, celebrationStage);
      } catch {
        // Storage write failed — dismiss anyway; celebration will retrigger on next open
      }
    }
    setCelebrationStage(null);
  }

  // Derived values
  const evolutionStage = getEvolutionStage(totalSessionsEver);
  const petEmoji = EVOLUTION_CONFIG[evolutionStage].emoji;
  const feedAvailable =
    lastFedTime === null || Date.now() - lastFedTime >= FEED_COOLDOWN_MS;
  const mood = calculateMood({
    sessionsCompleted: sessionsToday,
    lastFedTime,
    screenTimeEnabled: usageStatsEnabled,
  });
  const moodConfig = MOOD_CONFIG[mood];

  // Theme-aware colors
  const surface = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;
  const border = isDark ? PetBloomColors.borderDark : PetBloomColors.border;
  const textMuted = isDark
    ? PetBloomColors.textMutedDark
    : PetBloomColors.textMuted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header: Greeting + Date + Settings */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <ThemedText style={styles.greeting}>
                  {getGreeting()}, {petName}!
                </ThemedText>
                <ThemedText style={[styles.date, { color: textMuted }]}>
                  {getFormattedDate()}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/settings")}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <IconSymbol name="gearshape.fill" size={24} color={textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Streak + Coins row */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.streakBadge,
                { backgroundColor: PetBloomColors.primaryLight },
              ]}
            >
              <ThemedText
                style={[styles.streakText, { color: PetBloomColors.streak }]}
              >
                🔥 {currentStreak} day streak
              </ThemedText>
            </View>
            <View style={[styles.coinBadge, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <ThemedText style={[styles.streakText, { color: PetBloomColors.thriving }]}>
                🪙 {coins}
              </ThemedText>
            </View>
          </View>

          {/* Pet Area */}
          <View style={styles.petArea}>
            <ThemedText style={styles.petEmoji}>{petEmoji}</ThemedText>
            <ThemedText style={styles.petName}>{petName}</ThemedText>
            <ThemedText
              style={[styles.moodLabel, { color: PetBloomColors[mood] }]}
            >
              {moodConfig.emoji} {moodConfig.label}
            </ThemedText>
            {dailyMessage !== "" && (
              <ThemedText style={[styles.dailyMessage, { color: textMuted }]}>
                {`\u201C${dailyMessage}\u201D`}
              </ThemedText>
            )}
          </View>

          {/* XP Progress Bar */}
          <XpProgressBar
            totalSessionsEver={totalSessionsEver}
            currentStage={evolutionStage}
          />

          {/* Action Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: PetBloomColors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => router.push("/(tabs)/focus")}
            >
              <ThemedText style={styles.buttonText}>
                🐾 Time with {petName}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: PetBloomColors.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => router.push("/feed")}
            >
              <View style={styles.feedButtonInner}>
                <ThemedText style={styles.buttonText}>
                  🍎 Feed {fishName}
                </ThemedText>
                {feedAvailable && <View style={styles.feedDot} />}
              </View>
            </Pressable>
          </View>

          {/* Today's Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: surface }]}>
            <View style={styles.stat}>
              <ThemedText
                style={[styles.statValue, { color: PetBloomColors.focusBar }]}
              >
                {formatDuration(focusTimeToday)}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textMuted }]}>
                Screen Away Time
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: border }]} />
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>{sessionsToday}</ThemedText>
              <ThemedText style={[styles.statLabel, { color: textMuted }]}>
                Visits
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: border }]} />
            <View style={styles.stat}>
              <ThemedText
                style={[styles.statValue, { color: PetBloomColors.thriving }]}
              >
                {formatDuration(personalBest)}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: textMuted }]}>
                Personal best
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </ThemedView>

      {/* Evolution celebration overlay */}
      {celebrationStage && (
        <EvolutionCelebration
          visible
          petName={petName}
          newStage={celebrationStage}
          totalSessions={totalSessionsEver}
          onDismiss={handleEvolutionDismiss}
        />
      )}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
  },
  date: {
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  streakBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 15,
    fontWeight: "700",
  },
  petArea: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  petEmoji: {
    fontSize: 96,
    lineHeight: 110,
  },
  petName: {
    fontSize: 24,
    fontWeight: "700",
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  dailyMessage: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 16,
    marginTop: 4,
  },
  buttons: {
    gap: 12,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: {
    color: PetBloomColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  feedButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PetBloomColors.white,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  stat: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
});

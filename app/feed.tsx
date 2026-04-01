import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PetBloomColors } from "@/src/constants/Colors";
import {
  canFeed,
  feedProgressPercent,
  feedsToNextStage,
  getFeedPetSize,
  getFeedPetStage,
  timeUntilNextFeed,
} from "@/src/services/FeedService";
import { calculateMood } from "@/src/services/MoodService";
import { getItem, removeItem, setItem } from "@/src/storage/AppStorage";
import { STORAGE_KEYS } from "@/src/storage/keys";
import { recordQuestEvent } from "@/src/services/QuestStorage";

const TOTAL_TAPS = 3;

type Particle = {
  id: number;
  offsetX: number;
  translateY: Animated.Value;
  opacity: Animated.Value;
};

export default function FeedScreen() {
  const isDark = useColorScheme() === "dark";

  const [fishName, setFishName] = useState("Mochi");
  const [totalFeeds, setTotalFeeds] = useState(0);
  const [lastFedTime, setLastFedTime] = useState<number | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [statsEnabled, setStatsEnabled] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hatchAnim = useRef(new Animated.Value(0)).current;
  const eggShakeAnim = useRef(new Animated.Value(0)).current;
  const particleIdRef = useRef(0);

  // Derived: is this the very first feed ever?
  const isFirstFeed = totalFeeds === 0 && !justCompleted;
  const isHatching = justCompleted && totalFeeds === 1;

  // Trigger hatch animation when first feed completes
  useEffect(() => {
    if (!isHatching) return;
    Animated.sequence([
      // Rapid shakes
      Animated.timing(eggShakeAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(eggShakeAnim, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(eggShakeAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(eggShakeAnim, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(eggShakeAnim, { toValue: 0.5, duration: 70, useNativeDriver: true }),
      Animated.timing(eggShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      // Reveal fish
      Animated.spring(hatchAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
        mass: 0.8,
      }),
    ]).start();
  }, [isHatching]);

  const stage = getFeedPetStage(totalFeeds);
  const fishSize = getFeedPetSize(stage);
  const feedAvailable = canFeed(lastFedTime);
  const remaining = feedsToNextStage(totalFeeds);
  const progressPercent = feedProgressPercent(totalFeeds);
  const textMuted = isDark
    ? PetBloomColors.textMutedDark
    : PetBloomColors.textMuted;
  const trackColor = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;

  const loadData = useCallback(async () => {
    const [name, feeds, lastFed, sessions, stats] = await Promise.all([
      getItem<string>(STORAGE_KEYS.FEED_PET_NAME),
      getItem<number>(STORAGE_KEYS.TOTAL_FEEDS),
      getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
      getItem<number>(STORAGE_KEYS.SESSIONS_TODAY),
      getItem<boolean>(STORAGE_KEYS.USAGE_STATS_ENABLED),
    ]);
    setFishName(name ?? "Mochi");
    setTotalFeeds(feeds ?? 0);
    setLastFedTime(lastFed ?? null);
    setSessionsToday(sessions ?? 0);
    setStatsEnabled(stats ?? false);
    setTapCount(0);
    setJustCompleted(false);
    hatchAnim.setValue(0);
    eggShakeAnim.setValue(0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  function spawnParticles() {
    const newParticles: Particle[] = Array.from({ length: 4 }, () => {
      const id = particleIdRef.current++;
      const translateY = new Animated.Value(0);
      const opacity = new Animated.Value(1);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -70 - Math.random() * 40,
          duration: 600 + Math.random() * 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600 + Math.random() * 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      });

      return { id, offsetX: (Math.random() - 0.5) * 80, translateY, opacity };
    });

    setParticles((prev) => [...prev, ...newParticles]);
  }

  function animateTap(isEgg: boolean) {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 50,
        bounciness: 12,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }),
    ]).start();

    if (isEgg) {
      // Wiggle the egg on each tap
      Animated.sequence([
        Animated.timing(eggShakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(eggShakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(eggShakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }

  async function handleTap() {
    if (!feedAvailable || justCompleted) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    animateTap(isFirstFeed);
    spawnParticles();

    const next = tapCount + 1;
    setTapCount(next);

    if (next >= TOTAL_TAPS) {
      const now = Date.now();
      const newTotal = totalFeeds + 1;

      await Promise.all([
        setItem(STORAGE_KEYS.TOTAL_FEEDS, newTotal),
        setItem(STORAGE_KEYS.LAST_FED_TIME, now),
      ]);

      setTotalFeeds(newTotal);
      setLastFedTime(now);
      setJustCompleted(true);
      calculateMood({ sessionsCompleted: sessionsToday, lastFedTime: now, screenTimeEnabled: statsEnabled });
      await recordQuestEvent({ type: 'feed' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(
        () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
        180,
      );
      setTimeout(
        () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
        360,
      );
    }
  }

  async function handleDevReset() {
    await Promise.all([
      removeItem(STORAGE_KEYS.LAST_FED_TIME),
      setItem(STORAGE_KEYS.TOTAL_FEEDS, 0),
    ]);
    loadData();
  }

  // ── Derive UI state ──────────────────────────────────────────────
  const onCooldown = !feedAvailable && !justCompleted;
  const cooldownText = lastFedTime
    ? `Come back in ${timeUntilNextFeed(lastFedTime)}`
    : "";

  let headingText = `${fishName} is hungry! 🥺`;
  if (isHatching) headingText = `Meet ${fishName}! 🐟`;
  else if (justCompleted) headingText = `${fishName} is full! 🎉`;
  else if (onCooldown) headingText = `${fishName} is happy!`;
  else if (isFirstFeed && tapCount === 0) headingText = `Tap to hatch ${fishName}!`;
  else if (tapCount > 0) headingText = `${TOTAL_TAPS - tapCount} more taps!`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Heading */}
        <ThemedText style={styles.heading}>{headingText}</ThemedText>

        {/* Fish / Egg */}
        <View style={styles.fishArea}>
          <Pressable
            onPress={handleTap}
            disabled={onCooldown || justCompleted}
            style={styles.fishWrapper}
            accessibilityRole="button"
            accessibilityLabel={isFirstFeed ? "Hatch pet" : "Feed pet"}
            accessibilityHint="Tap three times to feed the pet"
            accessibilityState={{ disabled: onCooldown || justCompleted }}
          >
            {/* Fixed-size container so egg and fish overlay each other during hatch */}
            <Animated.View style={[styles.petContainer, { transform: [{ scale: scaleAnim }] }]}>
              {/* Egg — visible before first feed and fades out during hatch */}
              {(isFirstFeed || isHatching) && (
                <Animated.Text
                  style={[
                    styles.petAbsolute,
                    {
                      fontSize: 96,
                      opacity: hatchAnim.interpolate({
                        inputRange: [0, 0.35, 0.6],
                        outputRange: [1, 1, 0],
                        extrapolate: 'clamp',
                      }),
                      transform: [
                        {
                          rotate: eggShakeAnim.interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: ['-18deg', '0deg', '18deg'],
                          }),
                        },
                        {
                          scale: hatchAnim.interpolate({
                            inputRange: [0, 0.35, 0.6],
                            outputRange: [1, 1.25, 0.4],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  🥚
                </Animated.Text>
              )}

              {/* Fish — always rendered after first feed; springs in during hatch */}
              {!isFirstFeed && (
                <Animated.Text
                  style={[
                    styles.petAbsolute,
                    {
                      fontSize: fishSize,
                      opacity: isHatching
                        ? hatchAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [0, 0, 1],
                            extrapolate: 'clamp',
                          })
                        : 1,
                      transform: [
                        {
                          scale: isHatching
                            ? hatchAnim.interpolate({
                                inputRange: [0, 0.5, 0.85, 1],
                                outputRange: [0, 0, 1.25, 1],
                                extrapolate: 'clamp',
                              })
                            : 1,
                        },
                      ],
                    },
                  ]}
                >
                  🐟
                </Animated.Text>
              )}
            </Animated.View>
          </Pressable>
          {particles.map((p) => (
            <Animated.Text
              key={p.id}
              style={[
                styles.particle,
                {
                  transform: [
                    { translateX: p.offsetX },
                    { translateY: p.translateY },
                  ],
                  opacity: p.opacity,
                },
              ]}
            >
              🫧
            </Animated.Text>
          ))}
        </View>

        {/* Growth progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <ThemedText style={[styles.progressLabel, { color: textMuted }]}>
              {remaining !== null
                ? `${remaining} feed${remaining !== 1 ? "s" : ""} until ${fishName} grows`
                : `${fishName} is fully grown! 🎉`}
            </ThemedText>
            {remaining !== null && (
              <ThemedText style={[styles.progressLabel, { color: textMuted }]}>
                {progressPercent}%
              </ThemedText>
            )}
          </View>
          <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        {/* Tap dots — only shown while feeding is available */}
        {feedAvailable && !justCompleted && (
          <View style={styles.dotsRow}>
            {Array.from({ length: TOTAL_TAPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i < tapCount
                        ? PetBloomColors.accent
                        : isDark
                          ? PetBloomColors.surfaceDark
                          : PetBloomColors.surface,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Cooldown / completion message */}
        {(onCooldown || justCompleted) && (
          <ThemedText style={[styles.cooldownText, { color: textMuted }]}>
            {cooldownText}
          </ThemedText>
        )}

        {/* Feed count */}
        <ThemedText style={[styles.stageLabel, { color: textMuted }]}>
          {fishName} · {totalFeeds} feed{totalFeeds !== 1 ? "s" : ""}
        </ThemedText>

        {/* DEV: reset feed state */}
        {__DEV__ && (
          <Pressable
            style={({ pressed }) => [
              styles.devReset,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={handleDevReset}
          >
            <ThemedText style={[styles.devResetText, { color: textMuted }]}>
              ⚡ reset feed
            </ThemedText>
          </Pressable>
        )}
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
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  fishArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  fishWrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fish: {
    lineHeight: 140,
  },
  petContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petAbsolute: {
    position: 'absolute',
    textAlign: 'center',
  },
  particle: {
    position: "absolute",
    fontSize: 18,
    pointerEvents: "none",
  },
  progressSection: {
    width: "100%",
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: PetBloomColors.accent,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cooldownText: {
    fontSize: 15,
    textAlign: "center",
  },
  stageLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    position: "absolute",
    bottom: 64,
  },
  devReset: {
    position: "absolute",
    bottom: 32,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  devResetText: {
    fontSize: 12,
  },
});

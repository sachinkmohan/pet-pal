import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PetPalColors } from "@/src/constants/Colors";
import {
  canFeed,
  feedProgressPercent,
  feedsToNextStage,
  getFeedPetSize,
  getFeedPetStage,
  timeUntilNextFeed,
} from "@/src/services/FeedService";
import { getItem, removeItem, setItem } from "@/src/storage/AppStorage";
import { STORAGE_KEYS } from "@/src/storage/keys";

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

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const particleIdRef = useRef(0);

  const stage = getFeedPetStage(totalFeeds);
  const fishSize = getFeedPetSize(stage);
  const feedAvailable = canFeed(lastFedTime);
  const remaining = feedsToNextStage(totalFeeds);
  const progressPercent = feedProgressPercent(totalFeeds);
  const textMuted = isDark
    ? PetPalColors.textMutedDark
    : PetPalColors.textMuted;
  const trackColor = isDark ? PetPalColors.surfaceDark : PetPalColors.surface;

  const loadData = useCallback(async () => {
    const [name, feeds, lastFed] = await Promise.all([
      getItem<string>(STORAGE_KEYS.FEED_PET_NAME),
      getItem<number>(STORAGE_KEYS.TOTAL_FEEDS),
      getItem<number>(STORAGE_KEYS.LAST_FED_TIME),
    ]);
    setFishName(name ?? "Mochi");
    setTotalFeeds(feeds ?? 0);
    setLastFedTime(lastFed ?? null);
    setTapCount(0);
    setJustCompleted(false);
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

  function animateTap() {
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
  }

  async function handleTap() {
    if (!feedAvailable || justCompleted) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    animateTap();
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(
        () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        180,
      );
      setTimeout(
        () =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
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
  if (justCompleted) headingText = `${fishName} is full! 🎉`;
  else if (onCooldown) headingText = `${fishName} is happy!`;
  else if (tapCount > 0) headingText = `${TOTAL_TAPS - tapCount} more taps!`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* Heading */}
        <ThemedText style={styles.heading}>{headingText}</ThemedText>

        {/* Fish */}
        <View style={styles.fishArea}>
          <Pressable
            onPress={handleTap}
            disabled={onCooldown || justCompleted}
            style={styles.fishWrapper}
            accessibilityRole="button"
            accessibilityLabel="Feed pet"
            accessibilityHint="Tap three times to feed the pet"
            accessibilityState={{ disabled: onCooldown || justCompleted }}
          >
            <Animated.Text
              style={[
                styles.fish,
                { fontSize: fishSize, transform: [{ scale: scaleAnim }] },
              ]}
            >
              🐟
            </Animated.Text>
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
                        ? PetPalColors.accent
                        : isDark
                          ? PetPalColors.surfaceDark
                          : PetPalColors.surface,
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
    backgroundColor: PetPalColors.accent,
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

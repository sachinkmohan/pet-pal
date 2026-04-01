import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetBloomColors } from '@/src/constants/Colors';
import {
  QUEST_COINS_REWARD,
  QUEST_DEFINITIONS,
  type DailyQuestState,
  type QuestDefinition,
} from '@/src/services/QuestService';
import {
  claimQuestReward,
  getCoins,
  loadOrInitQuestState,
} from '@/src/services/QuestStorage';

function formatCountdown(secondsLeft: number): string {
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function progressLabel(state: DailyQuestState, def: QuestDefinition): string {
  if (def.progressMode === 'minutes') {
    const current = Math.min(state.progress, def.target);
    return `${current} / ${def.target}`;
  }
  if (def.progressMode === 'bits') {
    const fed = (state.progress & 1) ? 1 : 0;
    const session = (state.progress & 2) ? 1 : 0;
    return `${fed + session} / 2`;
  }
  return `${Math.min(state.progress, def.target)} / ${def.target}`;
}

function progressRatio(state: DailyQuestState, def: QuestDefinition): number {
  if (def.progressMode === 'bits') {
    const count = ((state.progress & 1) ? 1 : 0) + ((state.progress & 2) ? 1 : 0);
    return Math.min(count / 2, 1);
  }
  return Math.min(state.progress / def.target, 1);
}

export default function QuestsScreen() {
  const isDark = useColorScheme() === 'dark';
  const [questState, setQuestState] = useState<DailyQuestState | null>(null);
  const [coins, setCoins] = useState(0);
  const [countdown, setCountdown] = useState(secondsUntilMidnight());

  // Coin reward animation
  const rewardOpacity = useRef(new Animated.Value(0)).current;
  const rewardTranslateY = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const [state, coinBalance] = await Promise.all([
      loadOrInitQuestState(),
      getCoins(),
    ]);
    setQuestState(state);
    setCoins(coinBalance);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Countdown timer — updates every 60s
  useEffect(() => {
    const id = setInterval(() => setCountdown(secondsUntilMidnight()), 60000);
    return () => clearInterval(id);
  }, []);

  async function handleClaim() {
    const result = await claimQuestReward();
    if (result.success) {
      setCoins(result.newCoinTotal);
      setQuestState((prev) => prev ? { ...prev, claimed: true } : prev);
      animateCoinReward();
    }
  }

  function animateCoinReward() {
    rewardOpacity.setValue(1);
    rewardTranslateY.setValue(0);
    Animated.parallel([
      Animated.timing(rewardTranslateY, { toValue: -40, duration: 800, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(rewardOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }

  if (!questState) return null;

  const def = QUEST_DEFINITIONS[questState.questId];
  const ratio = progressRatio(questState, def);
  const label = progressLabel(questState, def);
  const isComplete = questState.completed;
  const isClaimed = questState.claimed;

  const cardBg = isDark ? PetBloomColors.backgroundDark : PetBloomColors.background;
  const textMuted = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;
  const pageBg = isDark ? PetBloomColors.questPageBgDark : PetBloomColors.questPageBg;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <ThemedText style={styles.heading}>Daily Quests</ThemedText>
          <View style={styles.coinBadge}>
            <ThemedText style={styles.coinText}>🪙 {coins}</ThemedText>
          </View>
        </View>

        <ThemedText style={[styles.resetLabel, { color: textMuted }]}>
          Resets in {formatCountdown(countdown)}
        </ThemedText>

        {/* Quest card */}
        <View style={[styles.questCard, { backgroundColor: cardBg, borderColor: isComplete && !isClaimed ? PetBloomColors.thriving : 'transparent' }]}>
          {/* Icon */}
          <View style={[styles.iconBox, { backgroundColor: isComplete ? PetBloomColors.accentLight : PetBloomColors.primaryLight }]}>
            <ThemedText style={styles.iconEmoji}>{def.icon}</ThemedText>
          </View>

          {/* Text + progress */}
          <View style={styles.questBody}>
            <ThemedText style={styles.questName}>{def.name}</ThemedText>
            <ThemedText style={[styles.questDesc, { color: textMuted }]}>{def.description}</ThemedText>

            {/* Progress bar */}
            <View style={styles.progressRow}>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface }]}>
                <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
              <ThemedText style={[styles.progressText, { color: textMuted }]}>{label}</ThemedText>
            </View>

            {/* Reward badge */}
            <ThemedText style={[styles.rewardBadge, { color: PetBloomColors.thriving }]}>
              🪙 +{QUEST_COINS_REWARD}
            </ThemedText>
          </View>

          {/* Action button */}
          <View style={styles.actionArea}>
            {isClaimed ? (
              <View style={styles.claimedBadge}>
                <ThemedText style={styles.claimedText}>✓</ThemedText>
              </View>
            ) : isComplete ? (
              <Pressable
                style={({ pressed }) => [styles.claimButton, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleClaim}
              >
                <ThemedText style={styles.claimButtonText}>Claim!</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.arrowButton, { backgroundColor: isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => router.push('/(tabs)/focus')}
              >
                <ThemedText style={[styles.arrowText, { color: textMuted }]}>→</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Floating coin reward animation */}
        <Animated.Text
          style={[
            styles.floatingReward,
            { opacity: rewardOpacity, transform: [{ translateY: rewardTranslateY }] },
          ]}
        >
          +{QUEST_COINS_REWARD} 🪙
        </Animated.Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
  },
  coinBadge: {
    backgroundColor: PetBloomColors.coinBadgeBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coinText: {
    fontSize: 14,
    fontWeight: '700',
    color: PetBloomColors.thriving,
  },
  resetLabel: {
    fontSize: 13,
    marginBottom: 20,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 26,
  },
  questBody: {
    flex: 1,
    gap: 4,
  },
  questName: {
    fontSize: 16,
    fontWeight: '700',
  },
  questDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressRow: {
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: PetBloomColors.thriving,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rewardBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButton: {
    backgroundColor: PetBloomColors.happy,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '600',
  },
  claimedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetBloomColors.happy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  floatingReward: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    fontSize: 22,
    fontWeight: '800',
    color: PetBloomColors.thriving,
  },
});

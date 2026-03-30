import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EvolutionCard, EvolutionStatus } from '@/components/evolution-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { XpProgressBar } from '@/components/xp-progress-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetBloomColors } from '@/src/constants/Colors';
import {
  EVOLUTION_CONFIG,
  EVOLUTION_ORDER,
  EvolutionStage,
  getEvolutionStage,
  getNextEvolutionStage,
} from '@/src/constants/PetStates';
import { getItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

export default function JourneyScreen() {
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();

  const [petName, setPetName] = useState('Pochi');
  const [totalSessionsEver, setTotalSessionsEver] = useState(0);

  const loadData = useCallback(async () => {
    const [name, total] = await Promise.all([
      getItem<string>(STORAGE_KEYS.PET_NAME),
      getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
    ]);
    setPetName(name ?? 'Pochi');
    setTotalSessionsEver(total ?? 0);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const currentStage = getEvolutionStage(totalSessionsEver);
  const currentConfig = EVOLUTION_CONFIG[currentStage];
  const nextStage = getNextEvolutionStage(currentStage);
  const nextConfig = nextStage ? EVOLUTION_CONFIG[nextStage] : null;

  const surface = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;
  const textMuted = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;

  function stageStatus(stage: EvolutionStage): EvolutionStatus {
    const required = EVOLUTION_CONFIG[stage].sessionsRequired;
    const currentRequired = currentConfig.sessionsRequired;
    if (required < currentRequired) return 'completed';
    if (stage === currentStage) return 'current';
    return 'locked';
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <ThemedText style={styles.title}>🐣 Journey</ThemedText>

          {/* Current stage card */}
          <View style={[styles.currentCard, { backgroundColor: surface }]}>
            <ThemedText style={styles.currentEmoji}>{currentConfig.emoji}</ThemedText>
            <ThemedText style={styles.currentName}>
              {petName} — {currentConfig.name}
            </ThemedText>
            <ThemedText style={[styles.currentSessions, { color: textMuted }]}>
              {totalSessionsEver} total session{totalSessionsEver !== 1 ? 's' : ''}
            </ThemedText>

            <View style={styles.xpBarWrapper}>
              <XpProgressBar
                totalSessionsEver={totalSessionsEver}
                currentStage={currentStage}
              />
            </View>
          </View>

          {/* Next evolution preview */}
          {nextConfig && (
            <View style={[styles.nextPreview, { backgroundColor: PetBloomColors.primaryLight }]}>
              <ThemedText style={styles.nextLabel}>Next evolution</ThemedText>
              <View style={styles.nextRow}>
                <ThemedText style={styles.nextEmoji}>{currentConfig.emoji}</ThemedText>
                <ThemedText style={[styles.nextArrow, { color: PetBloomColors.primary }]}>→</ThemedText>
                <ThemedText style={styles.nextEmoji}>{nextConfig.emoji}</ThemedText>
                <View style={styles.nextInfo}>
                  <ThemedText style={[styles.nextName, { color: PetBloomColors.primary }]}>
                    {nextConfig.name}
                  </ThemedText>
                  <ThemedText style={[styles.nextReward, { color: textMuted }]}>
                    Unlocks: {nextConfig.unlockReward}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Evolution timeline */}
          <ThemedText style={styles.timelineHeader}>Evolution Path</ThemedText>

          <View style={styles.timeline}>
            {EVOLUTION_ORDER.map((stage, index) => (
              <EvolutionCard
                key={stage}
                stage={stage}
                status={stageStatus(stage)}
                showConnector={index < EVOLUTION_ORDER.length - 1}
              />
            ))}
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
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  currentCard: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 20,
  },
  currentEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  currentName: {
    fontSize: 20,
    fontWeight: '700',
  },
  currentSessions: {
    fontSize: 13,
  },
  xpBarWrapper: {
    width: '100%',
    marginTop: 4,
  },
  nextPreview: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  nextLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextEmoji: {
    fontSize: 32,
  },
  nextArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  nextInfo: {
    flex: 1,
    gap: 2,
  },
  nextName: {
    fontSize: 16,
    fontWeight: '700',
  },
  nextReward: {
    fontSize: 13,
  },
  timelineHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: -8,
  },
  timeline: {
    gap: 0,
  },
});

import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const EVOLUTION_STAGES = [
  { emoji: '🥚', name: 'Egg', label: 'Starting state', sessions: 0, unlocked: true },
  { emoji: '🐣', name: 'Baby Chick', label: 'New food options', sessions: 10, unlocked: false },
  { emoji: '🐥', name: 'Fluffy Chick', label: 'Accessories slot', sessions: 25, unlocked: false },
  { emoji: '🐦', name: 'Teen Bird', label: 'New background theme', sessions: 50, unlocked: false },
  { emoji: '🦅', name: 'Adult Eagle', label: 'Special animation', sessions: 100, unlocked: false },
  { emoji: '🦄', name: 'Legendary', label: 'Shareable card + badge', sessions: 200, unlocked: false },
];

export default function JourneyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>🐣 Journey</ThemedText>

        <View style={styles.currentStage}>
          <ThemedText style={styles.currentEmoji}>🥚</ThemedText>
          <ThemedText style={styles.currentName}>Pochi — Egg</ThemedText>
          <View style={styles.xpBarBg}>
            <View style={styles.xpBarFill} />
          </View>
          <ThemedText style={styles.xpLabel}>0 / 10 sessions to Baby Chick</ThemedText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.timeline}>
          {EVOLUTION_STAGES.map((stage, index) => (
            <View key={stage.name} style={styles.stageRow}>
              <View style={[styles.stageIcon, !stage.unlocked && styles.stageIconLocked]}>
                <ThemedText style={styles.stageEmoji}>{stage.emoji}</ThemedText>
              </View>
              <View style={styles.stageInfo}>
                <ThemedText style={[styles.stageName, !stage.unlocked && styles.stageLocked]}>
                  {stage.name}
                </ThemedText>
                <ThemedText style={[styles.stageDetail, !stage.unlocked && styles.stageLocked]}>
                  {stage.sessions === 0 ? 'Start' : `${stage.sessions} sessions`} • {stage.label}
                </ThemedText>
              </View>
              {stage.unlocked && (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>✓</ThemedText>
                </View>
              )}
              {index < EVOLUTION_STAGES.length - 1 && (
                <View style={styles.connector} />
              )}
            </View>
          ))}
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
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  currentStage: {
    alignItems: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  currentEmoji: {
    fontSize: 64,
  },
  currentName: {
    fontSize: 18,
    fontWeight: '700',
  },
  xpBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  xpBarFill: {
    width: '5%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0a7ea4',
  },
  xpLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  timeline: {
    flex: 1,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  stageIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(10,126,164,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIconLocked: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  stageEmoji: {
    fontSize: 28,
  },
  stageInfo: {
    flex: 1,
    gap: 2,
  },
  stageName: {
    fontSize: 16,
    fontWeight: '600',
  },
  stageDetail: {
    fontSize: 13,
    opacity: 0.7,
  },
  stageLocked: {
    opacity: 0.35,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  connector: {
    position: 'absolute',
    left: 25,
    bottom: -12,
    width: 2,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

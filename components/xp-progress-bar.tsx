import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetPalColors } from '@/src/constants/Colors';
import {
  EVOLUTION_CONFIG,
  EvolutionStage,
  getNextEvolutionStage,
  sessionsToNextEvolution,
} from '@/src/constants/PetStates';

interface Props {
  totalSessionsEver: number;
  currentStage: EvolutionStage;
}

export function XpProgressBar({ totalSessionsEver, currentStage }: Props) {
  const isDark = useColorScheme() === 'dark';

  const nextStage = getNextEvolutionStage(currentStage);
  const sessionsLeft = sessionsToNextEvolution(totalSessionsEver, currentStage);
  const currentMin = EVOLUTION_CONFIG[currentStage].sessionsRequired;
  const nextMin = nextStage ? EVOLUTION_CONFIG[nextStage].sessionsRequired : null;

  const progress =
    nextMin !== null ? (totalSessionsEver - currentMin) / (nextMin - currentMin) : 1;

  const surface = isDark ? PetPalColors.surfaceDark : PetPalColors.surface;
  const border = isDark ? PetPalColors.borderDark : PetPalColors.border;
  const textMuted = isDark ? PetPalColors.textMutedDark : PetPalColors.textMuted;

  if (nextStage === null) {
    return (
      <View style={styles.container}>
        <ThemedText style={[styles.maxLabel, { color: PetPalColors.thriving }]}>
          🏆 Maximum evolution reached!
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText style={styles.labelLeft}>XP Progress</ThemedText>
        <ThemedText style={[styles.labelRight, { color: textMuted }]}>
          {sessionsLeft ?? 0} sessions to evolve
        </ThemedText>
      </View>
      <View
        style={[
          styles.barBg,
          { backgroundColor: surface, borderColor: border, borderWidth: 1 },
        ]}
      >
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: PetPalColors.primary,
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelLeft: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelRight: {
    fontSize: 13,
  },
  barBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  maxLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

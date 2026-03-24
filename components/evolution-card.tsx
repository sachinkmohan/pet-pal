import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetPalColors } from '@/src/constants/Colors';
import { EVOLUTION_CONFIG, EvolutionStage } from '@/src/constants/PetStates';

export type EvolutionStatus = 'completed' | 'current' | 'locked';

interface Props {
  stage: EvolutionStage;
  status: EvolutionStatus;
  /** Draw a vertical connector line below this card toward the next stage */
  showConnector?: boolean;
}

export function EvolutionCard({ stage, status, showConnector = false }: Props) {
  const isDark = useColorScheme() === 'dark';
  const config = EVOLUTION_CONFIG[stage];

  const isLocked = status === 'locked';
  const isCurrent = status === 'current';

  const iconBg = isLocked
    ? (isDark ? PetPalColors.surfaceDark : PetPalColors.surface)
    : isCurrent
    ? PetPalColors.primaryLight
    : PetPalColors.accentLight;

  const connectorColor = isDark ? PetPalColors.borderDark : PetPalColors.border;

  return (
    <View style={styles.wrapper}>
      {/* Connector line to next card */}
      {showConnector && (
        <View style={[styles.connector, { backgroundColor: connectorColor }]} />
      )}

      <View
        style={[
          styles.row,
          isCurrent && {
            backgroundColor: isDark ? PetPalColors.surfaceDark : PetPalColors.primaryLight,
            borderRadius: 16,
            paddingHorizontal: 12,
          },
        ]}
      >
        {/* Stage icon circle */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: iconBg },
            isCurrent && { borderWidth: 2, borderColor: PetPalColors.primary },
          ]}
        >
          <ThemedText style={[styles.emoji, isLocked && styles.dimmed]}>
            {config.emoji}
          </ThemedText>
        </View>

        {/* Stage info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText style={[styles.name, isLocked && styles.dimmedText]}>
              {config.name}
            </ThemedText>
            {isCurrent && (
              <View style={styles.currentPill}>
                <ThemedText style={styles.currentPillText}>current</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.detail, isLocked && styles.dimmedText]}>
            {config.sessionsRequired === 0
              ? 'Starting state'
              : `${config.sessionsRequired} sessions · ${config.unlockReward}`}
          </ThemedText>
        </View>

        {/* Completed checkmark */}
        {status === 'completed' && (
          <View style={styles.checkCircle}>
            <ThemedText style={styles.checkText}>✓</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: 37,
    top: 60,
    width: 2,
    height: 28,
    zIndex: -1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    fontSize: 26,
  },
  dimmed: {
    opacity: 0.35,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  dimmedText: {
    opacity: 0.35,
  },
  currentPill: {
    backgroundColor: PetPalColors.primary,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentPillText: {
    color: PetPalColors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  detail: {
    fontSize: 12,
    opacity: 0.65,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PetPalColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkText: {
    color: PetPalColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});

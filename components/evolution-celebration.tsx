import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Share, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { ThemedText } from '@/components/themed-text';
import { PetBloomColors } from '@/src/constants/Colors';
import { EVOLUTION_CONFIG, EvolutionStage } from '@/src/constants/PetStates';

interface Props {
  visible: boolean;
  petName: string;
  newStage: EvolutionStage;
  totalSessions: number;
  onDismiss: () => void;
}

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '🌟', '🎈'];

export function EvolutionCelebration({
  visible,
  petName,
  newStage,
  totalSessions,
  onDismiss,
}: Props) {
  const isDark = useColorScheme() === 'dark';
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const config = EVOLUTION_CONFIG[newStage];
  const shareText = `${petName} just evolved into ${config.name}! 🎉\n${totalSessions} focus sessions completed.\n#PetBloom`;

  // Theme-aware tokens for secondary UI
  const rewardColor = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;
  const shareCardBg = isDark ? PetBloomColors.surfaceDark : PetBloomColors.primaryLight;
  const shareButtonBg = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  async function handleShare() {
    try {
      await Share.share({ message: shareText });
    } catch {
      // Share not available on this device — card text is already visible
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? PetBloomColors.backgroundDark : PetBloomColors.background,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Confetti strip */}
          <View style={styles.confettiRow}>
            {CONFETTI.map((symbol, i) => (
              <ThemedText key={i} style={styles.confetti}>
                {symbol}
              </ThemedText>
            ))}
          </View>

          {/* Evolved pet */}
          <ThemedText style={styles.petEmoji}>{config.emoji}</ThemedText>

          {/* Evolution message */}
          <ThemedText style={styles.evolvedHeading}>{petName} evolved!</ThemedText>
          <ThemedText style={[styles.stageName, { color: PetBloomColors.primary }]}>
            {config.name}
          </ThemedText>
          <ThemedText style={[styles.rewardText, { color: rewardColor }]}>
            Unlocked: {config.unlockReward}
          </ThemedText>

          {/* Shareable card */}
          <View style={[styles.shareCard, { backgroundColor: shareCardBg }]}>
            <ThemedText style={styles.shareCardLabel}>SHAREABLE CARD</ThemedText>
            <ThemedText style={styles.shareCardText}>{shareText}</ThemedText>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                { backgroundColor: shareButtonBg, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleShare}
            >
              <ThemedText style={[styles.shareButtonText, { color: PetBloomColors.primary }]}>
                Share 🎊
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.dismissButton,
                { backgroundColor: PetBloomColors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={onDismiss}
            >
              <ThemedText style={styles.dismissButtonText}>Awesome! 🌟</ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: PetBloomColors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  confettiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  confetti: {
    fontSize: 22,
  },
  petEmoji: {
    fontSize: 80,
    lineHeight: 92,
    marginVertical: 4,
  },
  evolvedHeading: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  stageName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  rewardText: {
    fontSize: 14,
    textAlign: 'center',
  },
  shareCard: {
    width: '100%',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginTop: 4,
  },
  shareCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.5,
  },
  shareCardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  shareButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dismissButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: PetBloomColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

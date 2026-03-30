import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PetBloomColors } from '@/src/constants/Colors';

interface GraceOverlayProps {
  visible: boolean;
  gracePeriodMs?: number; // default 10 000
  onExpired: () => void;
}

export function GraceOverlay({
  visible,
  gracePeriodMs = 10_000,
  onExpired,
}: GraceOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(gracePeriodMs / 1000));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Stable ref so interval never captures a stale onExpired (same pattern as CircularCountdown)
  const onExpiredRef = useRef(onExpired);
  useEffect(() => { onExpiredRef.current = onExpired; });

  useEffect(() => {
    if (visible) {
      setSecondsLeft(Math.ceil(gracePeriodMs / 1000));
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();

      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            onExpiredRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.card}>
        <ThemedText style={styles.emoji}>⚠️</ThemedText>
        <ThemedText style={styles.heading}>Your session is about to end!</ThemedText>
        <ThemedText style={styles.sub}>Come back to keep your streak alive</ThemedText>
        <ThemedText style={styles.countdown}>{secondsLeft}</ThemedText>
        <ThemedText style={[styles.sub, { color: PetBloomColors.textMuted }]}>
          seconds remaining
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PetBloomColors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 100,
  },
  card: {
    width: '100%',
    backgroundColor: PetBloomColors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 68,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: PetBloomColors.sick,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 64,
    fontWeight: '800',
    color: PetBloomColors.sick,
    lineHeight: 72,
  },
});

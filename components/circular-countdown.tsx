import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetBloomColors } from '@/src/constants/Colors';

// Same geometry as CircularSlider for visual consistency
const SIZE = 240;
const CENTER = SIZE / 2;
const TRACK_RADIUS = 96;
const STROKE_WIDTH = 16;

interface Props {
  totalSeconds: number;
  onComplete: () => void;
}

function degToXY(deg: number): { x: number; y: number } {
  const rad = (deg - 90) * (Math.PI / 180);
  return {
    x: CENTER + TRACK_RADIUS * Math.cos(rad),
    y: CENTER + TRACK_RADIUS * Math.sin(rad),
  };
}

/** Arc path covering `angle` degrees clockwise from the top. */
function buildArcPath(angle: number): string {
  if (angle <= 0) return '';
  if (angle >= 359.99) {
    // Full circle — use two half-arcs to avoid degenerate path
    const top = degToXY(0);
    const bottom = degToXY(180);
    return [
      `M ${top.x} ${top.y}`,
      `A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 1 1 ${bottom.x} ${bottom.y}`,
      `A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 1 1 ${top.x} ${top.y}`,
    ].join(' ');
  }
  const start = degToXY(0);
  const end = degToXY(angle);
  const largeArc = angle > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`,
  ].join(' ');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CircularCountdown({ totalSeconds, onComplete }: Props) {
  const isDark = useColorScheme() === 'dark';
  const [remaining, setRemaining] = useState(totalSeconds);

  // Keep latest onComplete in a ref so the interval never captures a stale closure
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    const endTime = Date.now() + totalSeconds * 1000;
    const id = setInterval(() => {
      const left = Math.round((endTime - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(id);
        setRemaining(0);
        setTimeout(() => onCompleteRef.current(), 0);
      } else {
        setRemaining(left);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const angle = progress * 359.99; // avoid degenerate full-circle at 100%
  const arcPath = buildArcPath(angle);
  const trackColor = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;
  const textMuted = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;

  return (
    <View style={styles.wrapper}>
      <Svg width={SIZE} height={SIZE}>
        {/* Background ring */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={TRACK_RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />

        {/* Remaining-time arc */}
        {arcPath !== '' && (
          <Path
            d={arcPath}
            stroke={PetBloomColors.primary}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Time label overlay */}
      <View style={styles.labelOverlay} pointerEvents="none">
        <ThemedText style={styles.timeText}>{formatTime(remaining)}</ThemedText>
        <ThemedText style={[styles.unitText, { color: textMuted }]}>remaining</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

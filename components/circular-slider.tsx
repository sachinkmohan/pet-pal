import { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetPalColors } from '@/src/constants/Colors';

// Fixed dimensions
const SIZE = 240;
const CENTER = SIZE / 2;
const TRACK_RADIUS = 96;
const STROKE_WIDTH = 16;
const THUMB_RADIUS = 13;

const MIN = 1;
const MAX = 60;

interface Props {
  value: number; // 1–60
  onChange: (value: number) => void;
}

/** Convert a value (1-60) to degrees from top (clockwise). */
function valueToDeg(value: number): number {
  if (value >= MAX) return 359.99; // avoid degenerate full-circle path
  return ((value - MIN) / (MAX - MIN)) * 360;
}

/**
 * Convert degrees (0 = top, clockwise) to SVG cartesian coordinates
 * relative to the circle center.
 */
function degToXY(deg: number, r: number): { x: number; y: number } {
  const rad = (deg - 90) * (Math.PI / 180);
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad),
  };
}

/** SVG arc path string from top to the current value angle. */
function buildArcPath(value: number): string {
  const angle = valueToDeg(value);
  if (angle <= 0) return '';
  const start = degToXY(0, TRACK_RADIUS);
  const end = degToXY(angle, TRACK_RADIUS);
  const largeArc = angle > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${TRACK_RADIUS} ${TRACK_RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`,
  ].join(' ');
}

/** Convert a raw touch position (relative to the component) to a 1-60 value. */
function touchToValue(x: number, y: number): number {
  const dx = x - CENTER;
  const dy = y - CENTER;
  // atan2 gives angle from 3-o'clock; +90° shifts to 12-o'clock origin
  let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  if (deg < 0) deg += 360;
  const raw = Math.round((deg / 360) * (MAX - MIN)) + MIN;
  return Math.max(MIN, Math.min(MAX, raw));
}

export function CircularSlider({ value, onChange }: Props) {
  const isDark = useColorScheme() === 'dark';

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onChange(touchToValue(e.nativeEvent.locationX, e.nativeEvent.locationY));
      },
      onPanResponderMove: (e) => {
        onChange(touchToValue(e.nativeEvent.locationX, e.nativeEvent.locationY));
      },
    })
  ).current;

  const angle = valueToDeg(value);
  const thumb = degToXY(angle, TRACK_RADIUS);
  const trackColor = isDark ? PetPalColors.surfaceDark : PetPalColors.surface;
  const arcPath = buildArcPath(value);

  return (
    <View style={styles.wrapper} {...panResponder.panHandlers}>
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

        {/* Active arc — only rendered when value > MIN */}
        {arcPath !== '' && (
          <Path
            d={arcPath}
            stroke={PetPalColors.primary}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Thumb outer circle */}
        <Circle
          cx={thumb.x}
          cy={thumb.y}
          r={THUMB_RADIUS}
          fill={PetPalColors.primary}
        />
        {/* Thumb inner dot */}
        <Circle
          cx={thumb.x}
          cy={thumb.y}
          r={THUMB_RADIUS / 2.5}
          fill={PetPalColors.white}
        />
      </Svg>

      {/* Duration label rendered in the centre via absolute overlay */}
      <View style={styles.labelOverlay} pointerEvents="none">
        <ThemedText style={styles.durationText}>{value}</ThemedText>
        <ThemedText
          style={[
            styles.unitText,
            { color: isDark ? PetPalColors.textMutedDark : PetPalColors.textMuted },
          ]}
        >
          min
        </ThemedText>
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
  durationText: {
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 58,
  },
  unitText: {
    fontSize: 18,
    fontWeight: '500',
  },
});

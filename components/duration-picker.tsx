import { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetBloomColors } from '@/src/constants/Colors';
import { HHMMToMinutes, clampDuration, minutesToHHMM } from '@/src/utils/durationPicker';

const ITEM_HEIGHT = 48;
const PICKER_HEIGHT = ITEM_HEIGHT * 3; // one above + selected + one below

const HOURS = Array.from({ length: 6 }, (_, i) => i);    // 0–5
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0–59

interface Props {
  value: number; // total minutes
  onChange: (minutes: number) => void;
}

export function DurationPicker({ value, onChange }: Props) {
  const isDark = useColorScheme() === 'dark';
  const { hours, mins } = minutesToHHMM(value);

  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);

  // Scroll to initial position on mount
  useEffect(() => {
    setTimeout(() => {
      hourRef.current?.scrollTo({ y: hours * ITEM_HEIGHT, animated: false });
      minRef.current?.scrollTo({ y: mins * ITEM_HEIGHT, animated: false });
    }, 50);
  }, []);

  function snapIndex(offsetY: number, max: number): number {
    return Math.min(Math.max(Math.round(offsetY / ITEM_HEIGHT), 0), max);
  }

  function onHourScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = snapIndex(e.nativeEvent.contentOffset.y, HOURS.length - 1);
    const total = clampDuration(HHMMToMinutes(idx, mins));
    onChange(total);
  }

  function onMinScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = snapIndex(e.nativeEvent.contentOffset.y, MINUTES.length - 1);
    const total = clampDuration(HHMMToMinutes(hours, idx));
    onChange(total);
  }

  const textColor = isDark ? '#ffffff' : '#11181C';
  const mutedColor = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;
  const selectorColor = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;

  return (
    <View style={styles.container}>
      {/* Hours column */}
      <ScrollView
        ref={hourRef}
        style={styles.column}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={onHourScrollEnd}
        onScrollEndDrag={onHourScrollEnd}
      >
        {HOURS.map((h) => (
          <View key={h} style={styles.item}>
            <ThemedText
              style={[
                styles.itemText,
                { color: h === hours ? textColor : mutedColor },
                h === hours && styles.selectedText,
              ]}
            >
              {String(h).padStart(2, '0')}
            </ThemedText>
          </View>
        ))}
      </ScrollView>

      <ThemedText style={[styles.colon, { color: textColor }]}>:</ThemedText>

      {/* Minutes column */}
      <ScrollView
        ref={minRef}
        style={styles.column}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={onMinScrollEnd}
        onScrollEndDrag={onMinScrollEnd}
      >
        {MINUTES.map((m) => (
          <View key={m} style={styles.item}>
            <ThemedText
              style={[
                styles.itemText,
                { color: m === mins ? textColor : mutedColor },
                m === mins && styles.selectedText,
              ]}
            >
              {String(m).padStart(2, '0')}
            </ThemedText>
          </View>
        ))}
      </ScrollView>

      {/* Selection highlight overlay */}
      <View pointerEvents="none" style={styles.overlayWrapper}>
        <View style={[styles.selectorTop, { backgroundColor: selectorColor }]} />
        <View style={[styles.selectorHighlight, { borderColor: PetBloomColors.primary }]} />
        <View style={[styles.selectorBottom, { backgroundColor: selectorColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    width: 160,
  },
  column: {
    flex: 1,
    height: PICKER_HEIGHT,
  },
  listContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 28,
    fontWeight: '400',
  },
  selectedText: {
    fontWeight: '700',
    fontSize: 32,
  },
  colon: {
    fontSize: 32,
    fontWeight: '700',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  selectorTop: {
    flex: 1,
    opacity: 0.7,
  },
  selectorHighlight: {
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  selectorBottom: {
    flex: 1,
    opacity: 0.7,
  },
});

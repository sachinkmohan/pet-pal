import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetBloomColors } from '@/src/constants/Colors';
import { buildDayLabels, buildWeekBars, findPeakIndex } from '@/src/services/StatsService';
import { getItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

export default function StatsScreen() {
  const isDark = useColorScheme() === 'dark';

  const [focusTimeToday, setFocusTimeToday] = useState(0);
  const [personalBest, setPersonalBest] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);

  const surface = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;
  const textMuted = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;
  const dividerColor = isDark ? PetBloomColors.borderDark : PetBloomColors.border;

  const loadData = useCallback(async () => {
    const [focusTime, pb, weekly] = await Promise.all([
      getItem<number>(STORAGE_KEYS.FOCUS_TIME_TODAY),
      getItem<number>(STORAGE_KEYS.PERSONAL_BEST),
      getItem<number[]>(STORAGE_KEYS.WEEKLY_FOCUS_DATA),
    ]);
    setFocusTimeToday(focusTime ?? 0);
    setPersonalBest(pb ?? 0);
    setWeeklyData(weekly ?? []);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const bars = buildWeekBars(weeklyData, focusTimeToday);
  const labels = buildDayLabels(new Date());
  const peakIndex = findPeakIndex(bars);
  const maxBar = Math.max(...bars, 1); // avoid divide-by-zero
  const weeklyTotal = bars.reduce((a, b) => a + b, 0);
  const dailyAvg = Math.round(weeklyTotal / 7);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <ThemedText style={styles.title}>Stats</ThemedText>

          {/* Today card */}
          <View style={[styles.card, { backgroundColor: surface }]}>
            <ThemedText style={[styles.cardLabel, { color: textMuted }]}>Today</ThemedText>
            <View style={styles.todayRow}>
              <View style={styles.todayStat}>
                <ThemedText style={[styles.todayValue, { color: PetBloomColors.focusBar }]}>
                  {focusTimeToday}m
                </ThemedText>
                <ThemedText style={[styles.todayLabel, { color: textMuted }]}>
                  Screen Away Time
                </ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: dividerColor }]} />
              <View style={styles.todayStat}>
                <ThemedText style={[styles.todayValue, { color: PetBloomColors.thriving }]}>
                  🏆 {personalBest}m
                </ThemedText>
                <ThemedText style={[styles.todayLabel, { color: textMuted }]}>
                  Personal best
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Weekly chart */}
          <View style={[styles.card, { backgroundColor: surface }]}>
            <ThemedText style={[styles.cardLabel, { color: textMuted }]}>This week</ThemedText>
            <View style={styles.chart}>
              {bars.map((val, i) => {
                const isPeak = i === peakIndex;
                const heightPct = val / maxBar;
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(heightPct * 100, val > 0 ? 4 : 0)}%`,
                            backgroundColor: isPeak
                              ? PetBloomColors.streak
                              : PetBloomColors.focusBar,
                            opacity: isPeak ? 1 : 0.55,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.barLabel,
                        { color: isPeak ? PetBloomColors.streak : textMuted },
                        isPeak && styles.barLabelPeak,
                      ]}
                    >
                      {labels[i]}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
            <View style={[styles.chartDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.weekSummary}>
              <View style={styles.weekStat}>
                <ThemedText style={[styles.weekValue, { color: PetBloomColors.focusBar }]}>
                  {weeklyTotal}m
                </ThemedText>
                <ThemedText style={[styles.weekLabel, { color: textMuted }]}>
                  Weekly total
                </ThemedText>
              </View>
              <View style={styles.weekStat}>
                <ThemedText style={styles.weekValue}>{dailyAvg}m</ThemedText>
                <ThemedText style={[styles.weekLabel, { color: textMuted }]}>
                  Daily avg
                </ThemedText>
              </View>
            </View>
          </View>

        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  todayValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  todayLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 48,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 0,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  barLabelPeak: {
    fontWeight: '700',
  },
  chartDivider: {
    height: 1,
    marginHorizontal: -4,
  },
  weekSummary: {
    flexDirection: 'row',
  },
  weekStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  weekValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  weekLabel: {
    fontSize: 12,
  },
});

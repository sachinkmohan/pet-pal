import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularSlider } from '@/components/circular-slider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetPalColors } from '@/src/constants/Colors';
import { EVOLUTION_CONFIG, getEvolutionStage } from '@/src/constants/PetStates';
import { getItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

const PRESETS = [5, 15, 30, 60] as const;

export default function FocusScreen() {
  const isDark = useColorScheme() === 'dark';

  const [duration, setDuration] = useState(25);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [petEmoji, setPetEmoji] = useState('🥚');
  const [petName, setPetName] = useState('Pochi');

  const loadData = useCallback(async () => {
    const [name, totalSessions] = await Promise.all([
      getItem<string>(STORAGE_KEYS.PET_NAME),
      getItem<number>(STORAGE_KEYS.TOTAL_SESSIONS_EVER),
    ]);
    const stage = getEvolutionStage(totalSessions ?? 0);
    setPetEmoji(EVOLUTION_CONFIG[stage].emoji);
    setPetName(name ?? 'Pochi');
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Theme-aware colors
  const chipBg = isDark ? PetPalColors.surfaceDark : PetPalColors.primaryLight;
  const toggleBg = isDark ? PetPalColors.surfaceDark : PetPalColors.surface;
  const textMuted = isDark ? PetPalColors.textMutedDark : PetPalColors.textMuted;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          alwaysBounceVertical={false}
        >
          {/* Title */}
          <ThemedText style={styles.title}>Focus Session</ThemedText>

          {/* Circular Slider */}
          <View style={styles.sliderWrapper}>
            <CircularSlider value={duration} onChange={setDuration} />
          </View>

          {/* Preset chips */}
          <View style={styles.presets}>
            {PRESETS.map((min) => {
              const isActive = duration === min;
              return (
                <Pressable
                  key={min}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isActive ? PetPalColors.primary : chipBg,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setDuration(min)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: isActive ? PetPalColors.white : PetPalColors.primary },
                    ]}
                  >
                    {min}m
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Pet preview */}
          <View style={styles.petPreview}>
            <ThemedText style={styles.petEmoji}>{petEmoji}</ThemedText>
            <ThemedText style={[styles.petCaption, { color: textMuted }]}>
              {petName} is ready to focus!
            </ThemedText>
          </View>

          {/* Music toggle */}
          <Pressable
            style={[styles.musicRow, { backgroundColor: toggleBg }]}
            onPress={() => setMusicEnabled((prev) => !prev)}
          >
            <ThemedText style={styles.musicIcon}>🌧️</ThemedText>
            <View style={styles.musicLabelGroup}>
              <ThemedText style={styles.musicLabel}>Rain sounds</ThemedText>
              <ThemedText style={[styles.musicSub, { color: textMuted }]}>
                Plays during session
              </ThemedText>
            </View>
            <View
              style={[
                styles.togglePill,
                { backgroundColor: musicEnabled ? PetPalColors.primary : PetPalColors.border },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: musicEnabled ? 18 : 2 }] },
                ]}
              />
            </View>
          </Pressable>

          {/* Start button */}
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: PetPalColors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              // Timer built in Session 10
            }}
          >
            <ThemedText style={styles.startButtonText}>
              Start — I won't touch my phone!
            </ThemedText>
          </Pressable>
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
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  sliderWrapper: {
    alignItems: 'center',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  petPreview: {
    alignItems: 'center',
    gap: 6,
  },
  petEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  petCaption: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  musicIcon: {
    fontSize: 28,
  },
  musicLabelGroup: {
    flex: 1,
    gap: 2,
  },
  musicLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  musicSub: {
    fontSize: 12,
  },
  togglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PetPalColors.white,
  },
  startButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startButtonText: {
    color: PetPalColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

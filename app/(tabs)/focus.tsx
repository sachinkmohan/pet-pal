import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function FocusScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>🎯 Focus</ThemedText>

        <View style={styles.sliderArea}>
          <ThemedText style={styles.duration}>25 min</ThemedText>
          <ThemedText style={styles.sliderHint}>← drag to set duration →</ThemedText>
        </View>

        <View style={styles.presets}>
          {[5, 15, 30, 60].map((min) => (
            <View key={min} style={styles.chip}>
              <ThemedText style={styles.chipText}>{min}m</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.petPreview}>
          <ThemedText style={styles.petEmoji}>🥚</ThemedText>
        </View>

        <View style={styles.musicRow}>
          <ThemedText style={styles.musicLabel}>🌧️ Rain</ThemedText>
          <View style={styles.toggle}>
            <ThemedText style={styles.toggleText}>Off</ThemedText>
          </View>
        </View>

        <View style={styles.startButton}>
          <ThemedText style={styles.startButtonText}>Start — I won't touch my phone!</ThemedText>
        </View>
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
    gap: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  sliderArea: {
    alignItems: 'center',
    gap: 8,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#0a7ea4',
    justifyContent: 'center',
  },
  duration: {
    fontSize: 48,
    fontWeight: '700',
  },
  sliderHint: {
    fontSize: 12,
    opacity: 0.5,
  },
  presets: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(10,126,164,0.15)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  petPreview: {
    alignItems: 'center',
  },
  petEmoji: {
    fontSize: 64,
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  musicLabel: {
    fontSize: 16,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  toggleText: {
    fontSize: 14,
  },
  startButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

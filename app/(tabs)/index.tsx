import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.petArea}>
          <ThemedText style={styles.petEmoji}>🥚</ThemedText>
          <ThemedText style={styles.petName}>Pochi</ThemedText>
          <ThemedText style={styles.mood}>😴 Tired</ThemedText>
        </View>

        <View style={styles.streak}>
          <ThemedText style={styles.streakText}>🔥 0 day streak</ThemedText>
        </View>

        <View style={styles.buttons}>
          <View style={styles.button}>
            <ThemedText style={styles.buttonText}>🎯 Start Focus Session</ThemedText>
          </View>
          <View style={[styles.button, styles.buttonSecondary]}>
            <ThemedText style={styles.buttonText}>🍎 Feed Pochi</ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>0m</ThemedText>
            <ThemedText style={styles.statLabel}>Focus today</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>0</ThemedText>
            <ThemedText style={styles.statLabel}>Sessions</ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={styles.statValue}>0m</ThemedText>
            <ThemedText style={styles.statLabel}>Personal best</ThemedText>
          </View>
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
    paddingTop: 16,
    gap: 24,
  },
  petArea: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  petEmoji: {
    fontSize: 96,
  },
  petName: {
    fontSize: 24,
    fontWeight: '700',
  },
  mood: {
    fontSize: 16,
    opacity: 0.7,
  },
  streak: {
    alignItems: 'center',
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttons: {
    gap: 12,
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#2e7d32',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
});

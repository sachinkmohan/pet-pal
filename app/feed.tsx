import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PetPalColors } from '@/src/constants/Colors';

// Placeholder — full implementation in Phase 4, Session 14
export default function FeedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <ThemedText style={styles.emoji}>🍎</ThemedText>
          <ThemedText style={styles.title}>Feed Screen</ThemedText>
          <ThemedText style={styles.subtitle}>Coming in Phase 4 — tap-to-feed mechanic</ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: PetPalColors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>← Back to Home</ThemedText>
        </Pressable>
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
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
  backButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: PetPalColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

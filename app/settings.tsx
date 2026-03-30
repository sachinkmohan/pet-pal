import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PetBloomColors } from '@/src/constants/Colors';
import { normalizePetName } from '@/src/utils/petName';
import { getItem, setItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const [pochiName, setPochiName] = useState('');
  const [mochiName, setMochiName] = useState('');
  const [saved, setSaved] = useState(false);

  const surface = isDark ? PetBloomColors.surfaceDark : PetBloomColors.surface;
  const textMuted = isDark ? PetBloomColors.textMutedDark : PetBloomColors.textMuted;
  const borderColor = isDark ? PetBloomColors.borderDark : PetBloomColors.border;

  const loadNames = useCallback(async () => {
    try {
      const [pochi, mochi] = await Promise.all([
        getItem<string>(STORAGE_KEYS.PET_NAME),
        getItem<string>(STORAGE_KEYS.FEED_PET_NAME),
      ]);
      setPochiName(pochi ?? 'Pochi');
      setMochiName(mochi ?? 'Mochi');
    } catch (e) {
      console.error('Failed to load pet names:', e);
      setPochiName('Pochi');
      setMochiName('Mochi');
      setSaved(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNames(); setSaved(false); }, [loadNames]));

  async function handleSave() {
    const finalPochi = normalizePetName(pochiName, 'Pochi');
    const finalMochi = normalizePetName(mochiName, 'Mochi');
    try {
      await Promise.all([
        setItem(STORAGE_KEYS.PET_NAME, finalPochi),
        setItem(STORAGE_KEYS.FEED_PET_NAME, finalMochi),
      ]);
      setPochiName(finalPochi);
      setMochiName(finalMochi);
      setSaved(true);
    } catch (e) {
      console.error('Failed to save pet names:', e);
      setSaved(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.container}>

          {/* Focus pet */}
          <View style={[styles.section, { backgroundColor: surface }]}>
            <ThemedText style={styles.sectionLabel}>Focus buddy</ThemedText>
            <View style={styles.nameRow}>
              <ThemedText style={styles.petEmoji}>🥚</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: isDark ? '#ffffff' : '#11181C' }]}
                value={pochiName}
                onChangeText={(v) => { setPochiName(v.slice(0, 12)); setSaved(false); }}
                placeholder="Pochi"
                placeholderTextColor={textMuted}
                maxLength={12}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
            <ThemedText style={[styles.hint, { color: textMuted }]}>
              Evolves by completing focus sessions
            </ThemedText>
          </View>

          {/* Feed pet */}
          <View style={[styles.section, { backgroundColor: surface }]}>
            <ThemedText style={styles.sectionLabel}>Daily fish</ThemedText>
            <View style={styles.nameRow}>
              <ThemedText style={styles.petEmoji}>🐟</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, color: isDark ? '#ffffff' : '#11181C' }]}
                value={mochiName}
                onChangeText={(v) => { setMochiName(v.slice(0, 12)); setSaved(false); }}
                placeholder="Mochi"
                placeholderTextColor={textMuted}
                maxLength={12}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
            <ThemedText style={[styles.hint, { color: textMuted }]}>
              Grows by being fed daily
            </ThemedText>
          </View>

          {/* Save button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              saved && styles.saveButtonSaved,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleSave}>
            <ThemedText style={styles.saveButtonText}>
              {saved ? '✓ Saved' : 'Save changes'}
            </ThemedText>
          </Pressable>

        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petEmoji: {
    fontSize: 32,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    marginLeft: 44,
  },
  saveButton: {
    backgroundColor: PetBloomColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonSaved: {
    backgroundColor: PetBloomColors.thriving,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

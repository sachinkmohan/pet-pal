import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { setItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

type Step = 'welcome' | 'name' | 'how-it-works' | 'permissions';
const STEPS: Step[] = ['welcome', 'name', 'how-it-works', 'permissions'];

export default function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [petName, setPetName] = useState('Pochi');

  const step = STEPS[stepIndex];

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }

  async function finishOnboarding() {
    await setItem(STORAGE_KEYS.PET_NAME, petName.trim() || 'Pochi');
    await setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    router.replace('/(tabs)');
  }

  async function skipPermissions() {
    await setItem(STORAGE_KEYS.USAGE_STATS_ENABLED, false);
    await finishOnboarding();
  }

  async function enablePermissions() {
    // UsageStats requires manual Settings navigation on Android — wire in Session 21
    await setItem(STORAGE_KEYS.USAGE_STATS_ENABLED, true);
    await finishOnboarding();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>

        {step === 'welcome' && <WelcomeStep onNext={goNext} />}
        {step === 'name' && (
          <NameStep petName={petName} onChange={setPetName} onNext={goNext} />
        )}
        {step === 'how-it-works' && <HowItWorksStep onNext={goNext} />}
        {step === 'permissions' && (
          <PermissionsStep onEnable={enablePermissions} onSkip={skipPermissions} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <Text style={styles.petEmoji}>🥚</Text>
        <Text style={styles.heading}>Meet your new friend!</Text>
        <Text style={styles.subheading}>Your habits shape who they become</Text>
      </View>
      <PrimaryButton label="Let's go →" onPress={onNext} />
    </View>
  );
}

function NameStep({
  petName,
  onChange,
  onNext,
}: {
  petName: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <Text style={styles.petEmoji}>🥚</Text>
        <Text style={styles.heading}>What will you name me?</Text>
        <TextInput
          style={styles.nameInput}
          value={petName}
          onChangeText={(v) => onChange(v.slice(0, 12))}
          placeholder="Pochi"
          placeholderTextColor="rgba(0,0,0,0.3)"
          maxLength={12}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
        <Text style={styles.charCount}>{petName.length}/12</Text>
      </View>
      <PrimaryButton
        label={`Name them ${petName.trim() || 'Pochi'} →`}
        onPress={onNext}
        disabled={petName.trim().length === 0}
      />
    </View>
  );
}

function HowItWorksStep({ onNext }: { onNext: () => void }) {
  const items = [
    { emoji: '🍎', title: 'Feed me daily', desc: 'Tap to feed once a day' },
    { emoji: '🎯', title: 'Focus with me', desc: 'I grow when you focus' },
    { emoji: '📊', title: 'Watch me evolve', desc: 'The more you focus, the stronger I get' },
  ];

  return (
    <View style={styles.step}>
      <Text style={[styles.heading, { marginBottom: 32 }]}>Here's how it works</Text>
      <View style={styles.howItems}>
        {items.map((item) => (
          <View key={item.title} style={styles.howItem}>
            <Text style={styles.howEmoji}>{item.emoji}</Text>
            <View style={styles.howText}>
              <Text style={styles.howTitle}>{item.title}</Text>
              <Text style={styles.howDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <PrimaryButton label="Got it!" onPress={onNext} />
    </View>
  );
}

function PermissionsStep({
  onEnable,
  onSkip,
}: {
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <Text style={styles.petEmoji}>📱</Text>
        <Text style={styles.heading}>Want me to track your screen time too?</Text>
        <Text style={styles.subheading}>
          This helps me react to how much you use your phone.
          {'\n'}The app works great without it.
        </Text>
      </View>
      <View style={styles.permButtons}>
        <PrimaryButton label="Enable screen time" onPress={onEnable} />
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  dotActive: {
    backgroundColor: '#0a7ea4',
    width: 24,
  },
  step: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  petEmoji: {
    fontSize: 96,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#11181C',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    color: 'rgba(17,24,28,0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    color: '#11181C',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: 'rgba(17,24,28,0.4)',
    alignSelf: 'flex-end',
  },
  howItems: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
  },
  howItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  howEmoji: {
    fontSize: 40,
    width: 56,
    textAlign: 'center',
  },
  howText: {
    flex: 1,
    gap: 2,
  },
  howTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#11181C',
  },
  howDesc: {
    fontSize: 14,
    color: 'rgba(17,24,28,0.6)',
  },
  permButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(17,24,28,0.5)',
  },
});

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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

        {step === 'welcome' && (
          <StepWrapper key="welcome">
            <WelcomeStep onNext={goNext} />
          </StepWrapper>
        )}
        {step === 'name' && (
          <StepWrapper key="name">
            <NameStep petName={petName} onChange={setPetName} onNext={goNext} />
          </StepWrapper>
        )}
        {step === 'how-it-works' && (
          <StepWrapper key="how-it-works">
            <HowItWorksStep onNext={goNext} />
          </StepWrapper>
        )}
        {step === 'permissions' && (
          <StepWrapper key="permissions">
            <PermissionsStep onEnable={enablePermissions} onSkip={skipPermissions} />
          </StepWrapper>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step transition wrapper ──────────────────────────────────────────────────

function StepWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(48)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 280,
        mass: 0.8,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.flex, { opacity, transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Floating egg (Welcome) ───────────────────────────────────────────────────

function FloatingEgg() {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -14,
          duration: 1600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ]),
    ).start();
  }, []);

  return (
    <Animated.Text style={[styles.petEmoji, { transform: [{ translateY }] }]}>
      🥚
    </Animated.Text>
  );
}

// ─── Wiggling egg (Name step) ─────────────────────────────────────────────────

function WigglingEgg({ trigger }: { trigger: string }) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(rotate, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1, duration: 70, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0.6, duration: 70, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]).start();
  }, [trigger]);

  const rotateStr = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <Animated.Text style={[styles.petEmoji, { transform: [{ rotate: rotateStr }] }]}>
      🥚
    </Animated.Text>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <FloatingEgg />
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
        <WigglingEgg trigger={petName} />
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

const HOW_ITEMS = [
  { emoji: '🍎', title: 'Feed me daily', desc: 'Tap to feed once a day' },
  { emoji: '🎯', title: 'Focus with me', desc: 'I grow when you focus' },
  { emoji: '📊', title: 'Watch me evolve', desc: 'The more you focus, the stronger I get' },
] as const;

function HowItWorksStep({ onNext }: { onNext: () => void }) {
  const anim0 = useRef(new Animated.Value(0)).current;
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anims = [anim0, anim1, anim2];

  useEffect(() => {
    Animated.stagger(
      150,
      anims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ),
    ).start();
  }, []);

  return (
    <View style={styles.step}>
      <Text style={[styles.heading, styles.howHeading]}>Here's how it works</Text>
      <View style={styles.howItems}>
        {HOW_ITEMS.map((item, i) => {
          const anim = anims[i];
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [24, 0],
          });
          return (
            <Animated.View
              key={item.title}
              style={[styles.howItem, { opacity: anim, transform: [{ translateY }] }]}>
              <Text style={styles.howEmoji}>{item.emoji}</Text>
              <View style={styles.howText}>
                <Text style={styles.howTitle}>{item.title}</Text>
                <Text style={styles.howDesc}>{item.desc}</Text>
              </View>
            </Animated.View>
          );
        })}
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
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <Animated.Text style={[styles.petEmoji, { transform: [{ scale: pulse }] }]}>
          📱
        </Animated.Text>
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
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 400,
    }).start();
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={1}>
      <Animated.View
        style={[
          styles.primaryButton,
          disabled && styles.primaryButtonDisabled,
          { transform: [{ scale }] },
        ]}>
        <Text style={styles.primaryButtonText}>{label}</Text>
      </Animated.View>
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
  howHeading: {
    marginTop: 8,
    marginBottom: 0,
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
    gap: 32,
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

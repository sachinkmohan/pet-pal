import * as Notifications from 'expo-notifications';
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

import { normalizePetName } from '@/src/utils/petName';
import { setItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';

type Step = 'welcome' | 'meet-pochi' | 'meet-mochi' | 'how-it-works' | 'notifications';
const STEPS: Step[] = ['welcome', 'meet-pochi', 'meet-mochi', 'how-it-works', 'notifications'];

export default function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [pochiName, setPochiName] = useState('Pochi');
  const [mochiName, setMochiName] = useState('Mochi');

  const step = STEPS[stepIndex];

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  }

  async function finishOnboarding() {
    await Promise.all([
      setItem(STORAGE_KEYS.PET_NAME, normalizePetName(pochiName, 'Pochi')),
      setItem(STORAGE_KEYS.FEED_PET_NAME, normalizePetName(mochiName, 'Mochi')),
      setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, true),
    ]);
    router.replace('/(tabs)');
  }

  async function handleEnableNotifications() {
    await Notifications.requestPermissionsAsync();
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
        {step === 'meet-pochi' && (
          <StepWrapper key="meet-pochi">
            <MeetPochiStep pochiName={pochiName} onChange={setPochiName} onNext={goNext} />
          </StepWrapper>
        )}
        {step === 'meet-mochi' && (
          <StepWrapper key="meet-mochi">
            <MeetMochiStep mochiName={mochiName} onChange={setMochiName} onNext={goNext} />
          </StepWrapper>
        )}
        {step === 'how-it-works' && (
          <StepWrapper key="how-it-works">
            <HowItWorksStep pochiName={normalizePetName(pochiName, 'Pochi')} mochiName={normalizePetName(mochiName, 'Mochi')} onNext={goNext} />
          </StepWrapper>
        )}
        {step === 'notifications' && (
          <StepWrapper key="notifications">
            <NotificationsStep
              pochiName={normalizePetName(pochiName, 'Pochi')}
              mochiName={normalizePetName(mochiName, 'Mochi')}
              onEnable={handleEnableNotifications}
              onSkip={finishOnboarding}
            />
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

// ─── Floating eggs (Welcome) ──────────────────────────────────────────────────

function FloatingEggs() {
  const translateY1 = useRef(new Animated.Value(0)).current;
  const translateY2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: -14,
            duration: 1600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ]),
      );

    const anim1 = float(translateY1, 0);
    const anim2 = float(translateY2, 0);

    // Stagger second egg
    setTimeout(() => anim2.start(), 500);
    anim1.start();

    return () => {
      anim1.stop();
      anim2.stop();
    };
  }, []);

  return (
    <View style={styles.eggsRow}>
      <Animated.Text style={[styles.petEmoji, { transform: [{ translateY: translateY1 }] }]}>
        🥚
      </Animated.Text>
      <Animated.Text style={[styles.petEmoji, { transform: [{ translateY: translateY2 }] }]}>
        🥚
      </Animated.Text>
    </View>
  );
}

// ─── Wiggling egg ─────────────────────────────────────────────────────────────

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
        <FloatingEggs />
        <Text style={styles.heading}>Meet your new friends!</Text>
        <Text style={styles.subheading}>Two companions. Two habits. One better you.</Text>
      </View>
      <PrimaryButton label="Let's go →" onPress={onNext} />
    </View>
  );
}

function MeetPochiStep({
  pochiName,
  onChange,
  onNext,
}: {
  pochiName: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const displayName = pochiName.trim() || 'Pochi';
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <WigglingEgg trigger={pochiName} />
        <Text style={styles.heading}>Your focus buddy</Text>
        <Text style={styles.subheading}>
          This little egg hatches when you focus.{'\n'}
          Complete sessions to evolve through{'\n'}
          6 stages — from egg to legendary.
        </Text>
        <TextInput
          style={styles.nameInput}
          value={pochiName}
          onChangeText={(v) => onChange(v.slice(0, 12))}
          placeholder="Pochi"
          placeholderTextColor="rgba(0,0,0,0.3)"
          maxLength={12}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
        <Text style={styles.charCount}>{pochiName.length}/12</Text>
      </View>
      <View style={styles.bottomGroup}>
        <Text style={styles.renameHint}>You can rename them anytime in Settings</Text>
        <PrimaryButton
          label={`Name them ${displayName} →`}
          onPress={onNext}
          disabled={pochiName.trim().length === 0}
        />
      </View>
    </View>
  );
}

function MeetMochiStep({
  mochiName,
  onChange,
  onNext,
}: {
  mochiName: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const displayName = mochiName.trim() || 'Mochi';
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <WigglingEgg trigger={mochiName} />
        <Text style={styles.heading}>Your little fish</Text>
        <Text style={styles.subheading}>
          This egg holds a hungry fish.{'\n'}
          Feed them once a day and they'll grow.{'\n'}
          Miss too many days and they get unhappy.
        </Text>
        <TextInput
          style={styles.nameInput}
          value={mochiName}
          onChangeText={(v) => onChange(v.slice(0, 12))}
          placeholder="Mochi"
          placeholderTextColor="rgba(0,0,0,0.3)"
          maxLength={12}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onNext}
        />
        <Text style={styles.charCount}>{mochiName.length}/12</Text>
      </View>
      <View style={styles.bottomGroup}>
        <Text style={styles.renameHint}>You can rename them anytime in Settings</Text>
        <PrimaryButton
          label={`Name them ${displayName} →`}
          onPress={onNext}
          disabled={mochiName.trim().length === 0}
        />
      </View>
    </View>
  );
}

const HOW_ITEMS = (pochiName: string, mochiName: string) => [
  { emoji: '🐟', title: `Feed ${mochiName} daily`, desc: 'Tap 3 times once a day to keep them happy' },
  { emoji: '🎯', title: `Focus with ${pochiName}`, desc: 'Complete focus sessions to level up' },
  { emoji: '✨', title: 'Watch both evolve', desc: `${pochiName} grows stronger, ${mochiName} grows bigger` },
] as const;

function HowItWorksStep({ pochiName, mochiName, onNext }: { pochiName: string; mochiName: string; onNext: () => void }) {
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

  const items = HOW_ITEMS(pochiName, mochiName);

  return (
    <View style={styles.step}>
      <Text style={[styles.heading, styles.howHeading]}>Here's how it works</Text>
      <View style={styles.howItems}>
        {items.map((item, i) => {
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

function NotificationsStep({
  pochiName,
  mochiName,
  onEnable,
  onSkip,
}: {
  pochiName: string;
  mochiName: string;
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
          🔔
        </Animated.Text>
        <Text style={styles.heading}>Don't let us starve!</Text>
        <Text style={styles.subheading}>
          Allow notifications so {pochiName} and {mochiName} can remind you when it's time to feed or focus.
        </Text>
      </View>
      <View style={styles.notifButtons}>
        <PrimaryButton label="Allow notifications" onPress={onEnable} />
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
  eggsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
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
  bottomGroup: {
    gap: 10,
  },
  renameHint: {
    fontSize: 13,
    color: 'rgba(17,24,28,0.4)',
    textAlign: 'center',
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
  notifButtons: {
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

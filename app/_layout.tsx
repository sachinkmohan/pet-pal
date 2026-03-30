import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getItem } from '@/src/storage/AppStorage';
import { STORAGE_KEYS } from '@/src/storage/keys';
import { initializeDefaultsIfNeeded, resetDailyDataIfNeeded } from '@/src/storage/seedData';

// Keep splash visible until we've checked onboarding status
SplashScreen.preventAutoHideAsync();

// Expo Router needs to know the default initial route
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      try {
        await initializeDefaultsIfNeeded();
        await resetDailyDataIfNeeded();
        const onboarded = await getItem<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);

        // Navigate while splash is still covering the screen — no flash
        if (!onboarded) {
          router.replace('/onboarding');
        }
      } catch (e) {
        // Storage error — proceed to main app but log for debugging
        console.warn('Storage initialization failed:', e);
      } finally {
        // Hide splash only after navigation is set
        SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  // Always render the Stack so the navigator is mounted before we navigate
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="feed" options={{ title: 'Feed', headerBackTitle: 'Home' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Home' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

import { Colors } from '@/constants/colors';
import { Fonts, fontAssets } from '@/constants/theme';
import '@/lib/nativewind-interop';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { queryClient } from '@/lib/react-query/queryClient';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

Sentry.init({
  dsn: 'https://2f173e7054b108e467755636e6e07c8f@o4512246155247616.ingest.us.sentry.io/4512246279110656',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Keep the splash up until the brand fonts are ready, so text never flashes in the system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default Sentry.wrap(function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // If fonts fail to load we still render (system font fallback) rather than block the app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: Colors.canvas },
            headerStyle: { backgroundColor: Colors.canvas },
            headerShadowVisible: false,
            headerTintColor: Colors.ink.DEFAULT,
            headerTitleStyle: {
              fontFamily: Fonts.bodyBold,
              fontSize: 17,
              color: Colors.ink.DEFAULT,
            },
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitleStyle: { fontFamily: Fonts.bodyMedium },
          }}
        >
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)/verify-email"
            options={{ title: 'Verify your email' }}
          />
          <Stack.Screen
            name="(auth)/change-password"
            options={{ title: 'Change password' }}
          />
          <Stack.Screen
            name="(auth)/forgot-password"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(screens)/dashboard/analytics"
            options={{ title: 'Detailed Analytics' }}
          />
          {/* Native header for the system back button; the large title is drawn in the screen. The profile's header is
              transparent so the cover photo runs up under it. */}
          <Stack.Screen
            name="(screens)/my-cats/create"
            options={{ title: 'Add Cat' }}
          />
          <Stack.Screen
            name="(screens)/my-cats/[id]/index"
            options={{
              title: '',
              headerTransparent: true,
              headerStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="(screens)/my-cats/[id]/edit"
            options={{ title: 'Edit cat' }}
          />
          <Stack.Screen
            name="(screens)/my-cats/archived"
            options={{ title: 'My Beloved Cats' }}
          />
          <Stack.Screen
            name="(screens)/logs/[id]/index"
            options={{ title: 'Log Detail' }}
          />
          <Stack.Screen
            name="(screens)/logs/[id]/create"
            options={{ title: 'Add New Log' }}
          />
          <Stack.Screen
            name="(screens)/logs/[id]/edit"
            options={{ title: 'Edit Log' }}
          />
          <Stack.Screen
            name="(screens)/diseases/[id]/index"
            options={{ title: 'Disease Detail' }}
          />
          <Stack.Screen
            name="(screens)/settings/index"
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="(screens)/settings/account"
            options={{ title: 'Account' }}
          />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
});

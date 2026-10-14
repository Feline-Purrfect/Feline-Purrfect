import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { queryClient } from '@/lib/react-query/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Sentry from '@sentry/react-native';

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
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: 'white' },
            headerBackTitle: 'Back',
          }}
        >
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/verify-email" options={{ title: 'Verify your email' }} />
          <Stack.Screen name="(auth)/change-password" options={{ title: 'Change password' }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(screens)/dashboard/analytics" options={{ title: 'Detailed Analytics' }} />
          <Stack.Screen
            name="(screens)/my-cats/create"
            options={{ title: 'Add New Cat' }}
          />
          <Stack.Screen
            name="(screens)/my-cats/[id]/edit"
            options={{ title: 'Edit Cat' }}
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
          <Stack.Screen name="(screens)/profile/index" options={{ title: 'Profile' }} />
          <Stack.Screen name="(screens)/profile/edit" options={{ title: 'Edit Profile' }} />
        </Stack>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
});

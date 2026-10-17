import { AuthGuard } from '@/components/common/AuthGuard';
import { Button, Text } from '@/components/ds';
import {
  SettingsRow,
  SettingsSection,
} from '@/components/settings/SettingsRow';
import { UserAvatar } from '@/components/settings/UserAvatar';
import { Colors } from '@/constants/colors';
import { useAuth, useSignOut } from '@/hooks/useAuth';
import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

// Notifications and the privacy policy get their own screens later.
const comingSoon = (what: string) =>
  Alert.alert('Coming soon', `${what} will be available soon.`);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const signOut = useSignOut();

  const confirmSignOut = () =>
    Alert.alert(
      'Sign out?',
      'You can sign back in any time with your email and password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => signOut.mutate(),
        },
      ],
    );

  return (
    <AuthGuard>
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          gap: 28,
        }}
      >
        {/* Who you are: one tap to the account page */}
        <Pressable
          onPress={() => router.push('/settings/account')}
          accessibilityRole="button"
          accessibilityLabel={`Account, ${user?.name || 'you'}, ${user?.email ?? ''}`}
          className="flex-row items-center gap-3.5 p-4 bg-surface border border-line rounded-card active:bg-fill"
        >
          <UserAvatar name={user?.name} className="w-14 h-14" />
          <View className="flex-1 min-w-0 gap-0.5">
            <Text
              numberOfLines={1}
              className="font-body-bold text-heading text-ink"
            >
              {user?.name || 'Your account'}
            </Text>
            <Text numberOfLines={1} variant="caption" className="text-label">
              {user?.email}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={Colors.ink.muted} />
        </Pressable>

        <SettingsSection title="App">
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() => comingSoon('Notification settings')}
          />
        </SettingsSection>

        <SettingsSection title="Account">
          <SettingsRow
            icon="lock"
            label="Change password"
            onPress={() => router.push('/change-password')}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow
            icon="shield"
            label="Privacy policy"
            external
            onPress={() => comingSoon('The privacy policy')}
          />
        </SettingsSection>

        <View className="mt-auto gap-3">
          <Button
            title="Sign out"
            variant="secondary"
            onPress={confirmSignOut}
            loading={signOut.isPending}
            className="h-[52px] rounded-cta bg-surface"
            textClassName="text-input"
          />
          <Text variant="caption" className="text-center">
            Feline Purrfect {APP_VERSION}
          </Text>
        </View>
      </ScrollView>
    </AuthGuard>
  );
}

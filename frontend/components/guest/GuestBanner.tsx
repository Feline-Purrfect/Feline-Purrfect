import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

/**
 * Shown to guests at the top of the tabs that display sample data. It says plainly that the cats
 * aren't theirs (so nobody mistakes the samples for their own records) and offers the one next step.
 * Renders nothing once signed in.
 */
export function GuestBanner({ className }: { className?: string }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated || user === undefined) return null;
  return (
    <Pressable
      onPress={() => router.push('/signup')}
      accessibilityRole="button"
      accessibilityLabel="You’re looking at sample cats. Sign up to track your own."
      className={cn(
        'flex-row items-center gap-3 bg-primary-50 border border-primary-200 rounded-card px-4 py-3 active:opacity-80',
        className,
      )}
    >
      <View className="w-8 h-8 rounded-full bg-surface items-center justify-center">
        <Feather name="eye" size={16} color={Colors.primary.pressed} />
      </View>
      <View className="flex-1">
        <Text variant="label" className="font-body-semibold text-ink">
          You’re looking at sample cats
        </Text>
        <Text variant="caption">Sign up to track your own.</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Colors.ink.muted} />
    </Pressable>
  );
}

/** Header button for guests, where signed-in people see Settings. */
export function GuestLoginButton() {
  return (
    <Pressable
      onPress={() => router.push('/login')}
      accessibilityRole="button"
      accessibilityLabel="Log in"
      className="h-11 px-4 rounded-full bg-primary items-center justify-center active:bg-primary-pressed"
    >
      <Text className="font-body-bold text-body text-white">Log in</Text>
    </Pressable>
  );
}

// Guest mode: the app can be explored with sample cats before creating an account.
// Anything that would save something asks the person to log in first.

import { AUTH_QUERY_KEY } from '@/lib/api/client';
import { queryClient } from '@/lib/react-query/queryClient';
import { router } from 'expo-router';
import { Alert } from 'react-native';

/** True once we know nobody is signed in (false while the session is still being read). */
export const isGuest = () => queryClient.getQueryData(AUTH_QUERY_KEY) === null;

/**
 * Call at the start of anything that creates or changes data. Signed in: returns true and the action
 * goes ahead. Guest: explains what an account is for, offers Log in / Sign up, and returns false.
 *
 *   if (!requireAccount('add a cat')) return;
 */
export function requireAccount(action: string): boolean {
  if (!isGuest()) return true;
  Alert.alert(
    'Create a free account',
    `To ${action}, log in or sign up. The cats you see now are samples for looking around.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Log in', onPress: () => router.push('/login') },
      { text: 'Sign up', onPress: () => router.push('/signup') },
    ],
  );
  return false;
}

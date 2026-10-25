import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

/**
 * Everyone lands on Home.
 * Signed-in people see their cats.
 * Anyone else explores with sample cats and is asked to log in when they try to save something (lib/guest.ts).
 */
export default function Index() {
  const { user } = useAuth();
  if (user === undefined) return <LoadingIndicator />; // still reading the stored session
  return <Redirect href="/(tabs)" />;
}

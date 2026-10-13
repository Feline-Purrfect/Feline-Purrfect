import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, user } = useAuth();

  // Show loading while checking auth
  if (user === undefined) {
    return <LoadingIndicator />;
  }

  // Redirect based on auth status
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  /** Let guests in too (they see sample data). Without it, guests are sent to log in. */
  allowGuest?: boolean;
}

export function AuthGuard({ children, allowGuest = false }: AuthGuardProps) {
  const { user, isAuthenticated } = useAuth();

  // Show loading while checking auth status
  if (user === undefined) {
    return <LoadingIndicator />;
  }

  if (!isAuthenticated && !allowGuest) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}

import { authApi } from '@/api/auth';
import { AUTH_QUERY_KEY } from '@/lib/api/client';
import { forgetPushToken, unregisterFromReminders } from '@/lib/notifications';
import { AuthUser, SignInRequest, SignUpRequest } from '@/types/auth';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

/** Drop every cached query that belongs to the previous user, keeping the auth query itself. */
function resetUserData(queryClient: QueryClient, user: AuthUser | null) {
  queryClient.setQueryData(AUTH_QUERY_KEY, user);
  // Reset (not just remove) everything else: screens still mounted underneath (e.g. Home showing sample
  // cats when the guest opened Log in) drop the old data and refetch as the new user right away.
  queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== AUTH_QUERY_KEY[0] });
}

// Get current user
export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: authApi.getCurrentUser,
    staleTime: Infinity, // User data doesn't go stale
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  };
}

// Sign Up
export function useSignUp() {
  return useMutation({
    mutationFn: (data: SignUpRequest) => authApi.signUp(data),
    onError: (error: any) => {
      console.error('Failed to sign up:', error);

      // Show user-friendly error alerts
      if (error.code === 'UsernameExistsException') {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists.',
        );
      } else if (error.code === 'InvalidPasswordException') {
        Alert.alert(
          'Invalid Password',
          'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
        );
      } else if (error.code === 'InvalidParameterException') {
        Alert.alert(
          'Invalid Input',
          error.message || 'Please check your information and try again.',
        );
      } else {
        Alert.alert(
          'Sign Up Failed',
          error.message || 'Unable to create account. Please try again.',
        );
      }
    },
  });
}

// Confirm Sign Up (Email Verification)
export function useConfirmSignUp() {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.confirmSignUp(email, code),
    onError: (error: any) => {
      console.error('Failed to verify email:', error);

      if (error.code === 'CodeMismatchException') {
        Alert.alert(
          'Invalid Code',
          'The verification code you entered is incorrect.',
        );
      } else if (error.code === 'ExpiredCodeException') {
        Alert.alert(
          'Code Expired',
          'Your verification code has expired. Please request a new one.',
        );
      } else if (error.code === 'NotAuthorizedException') {
        Alert.alert(
          'Already Verified',
          'This account is already verified. Please sign in.',
        );
      } else {
        Alert.alert(
          'Verification Failed',
          error.message || 'Unable to verify email. Please try again.',
        );
      }
    },
  });
}

// Resend Confirmation Code
export function useResendConfirmationCode() {
  return useMutation({
    mutationFn: (email: string) => authApi.resendConfirmationCode(email),
    // No success alert: the screen restarts its countdown and says a new code was sent.
    onError: (error: any) => {
      console.error('Failed to resend code:', error);
      Alert.alert(
        'Failed to Resend',
        error.message || 'Unable to send verification code. Please try again.',
      );
    },
  });
}

// Sign In
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInRequest) => authApi.signIn(data),
    onSuccess: (response) => {
      // Fresh session: never show cats/logs cached from a previous account (the device may be shared).
      resetUserData(queryClient, response.user);

      // Navigate to home, dropping the sign-in screens underneath (e.g. after a password reset) so
      // Back can't return to them.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(tabs)');
    },
    onError: (error: any, variables: SignInRequest) => {
      console.error('Failed to sign in:', error);

      // The API returns NotAuthorizedException for a WRONG PASSWORD and UserNotConfirmedException for an
      // unverified email. These were swapped before, so a typo'd password sent users to the verify screen.
      if (error.code === 'NotAuthorizedException') {
        // Wrong email or password: the login screen shows this inline next to the fields.
        return;
      } else if (error.code === 'UserNotConfirmedException') {
        Alert.alert(
          'Email Not Verified',
          "Your account isn't verified yet. We'll send you a new code.",
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Verify Now',
              onPress: () =>
                router.push({
                  pathname: '/verify-email',
                  params: { email: variables.email, resend: '1' },
                }),
            },
          ],
        );
      } else if (error.code === 'UserNotFoundException') {
        Alert.alert('Account Not Found', 'No account exists with this email.');
      } else if (error.code === 'PasswordResetRequiredException') {
        Alert.alert(
          'Password Reset Required',
          'You need to reset your password before signing in.',
        );
      } else {
        Alert.alert(
          'Sign In Failed',
          error.message || 'Unable to sign in. Please try again.',
        );
      }
    },
  });
}

// Sign Out
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Stop this phone getting the signed-out user's reminders. Needs the session, so it goes first;
      // a network failure must not block signing out.
      await unregisterFromReminders().catch((err) =>
        console.warn('Failed to unregister push token:', err),
      );
      await authApi.signOut();
    },
    onSuccess: () => {
      resetUserData(queryClient, null);
      router.replace('/(auth)/login');
    },
    onError: (error: any) => {
      console.error('Failed to sign out:', error);
      Alert.alert('Sign Out Failed', 'Unable to sign out. Please try again.');
    },
  });
}

// Forgot Password
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    // No success alert: the screen moves on to the code entry (or restarts its resend countdown).
    onError: (error: any) => {
      console.error('Failed to send reset code:', error);

      if (error.code === 'UserNotFoundException') {
        Alert.alert('Account Not Found', 'No account exists with this email.');
      } else if (error.code === 'LimitExceededException') {
        Alert.alert(
          'Too Many Attempts',
          'You have exceeded the maximum number of attempts. Please try again later.',
        );
      } else {
        Alert.alert(
          'Reset Failed',
          error.message || 'Unable to send reset code. Please try again.',
        );
      }
    },
  });
}

// Verify Reset Code (step 1 of a password reset)
export function useVerifyResetCode() {
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      authApi.verifyResetCode(email, code),
    onError: (error: any) => {
      console.error('Failed to verify reset code:', error);

      if (error.code === 'CodeMismatchException') {
        Alert.alert(
          'Code didn’t work',
          'That code is wrong or has expired. Check the latest email, or send a new code.',
        );
      } else if (error.code === 'LimitExceededException') {
        Alert.alert(
          'Too Many Attempts',
          'You have exceeded the maximum number of attempts. Please try again later.',
        );
      } else {
        Alert.alert(
          'Verification Failed',
          error.message || 'Unable to verify the code. Please try again.',
        );
      }
    },
  });
}

// Confirm Forgot Password (step 2 of a password reset)
export function useConfirmForgotPassword() {
  return useMutation({
    mutationFn: ({
      resetToken,
      newPassword,
    }: {
      resetToken: string;
      newPassword: string;
    }) => authApi.confirmForgotPassword(resetToken, newPassword),
    onError: (error: any) => {
      console.error('Failed to reset password:', error);

      if (error.code === 'ExpiredCodeException') {
        Alert.alert(
          'Code Expired',
          'Your reset code has expired. Please request a new one.',
        );
      } else if (error.code === 'InvalidPasswordException') {
        Alert.alert(
          'Invalid Password',
          error.message ||
            'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
        );
      } else {
        Alert.alert(
          'Reset Failed',
          error.message || 'Unable to reset password. Please try again.',
        );
      }
    },
  });
}

// Change Password
export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      oldPassword,
      newPassword,
    }: {
      oldPassword: string;
      newPassword: string;
    }) => authApi.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      Alert.alert('Success', 'Your password has been changed successfully.');
    },
    onError: (error: any) => {
      console.error('Failed to change password:', error);

      if (error.code === 'NotAuthorizedException') {
        Alert.alert(
          'Incorrect Password',
          'Your current password is incorrect.',
        );
      } else if (error.code === 'InvalidPasswordException') {
        Alert.alert(
          'Invalid Password',
          'New password must be at least 8 characters with uppercase, lowercase, number, and special character.',
        );
      } else if (error.code === 'LimitExceededException') {
        Alert.alert(
          'Too Many Attempts',
          'You have exceeded the maximum number of attempts. Please try again later.',
        );
      } else {
        Alert.alert(
          'Change Failed',
          error.message || 'Unable to change password. Please try again.',
        );
      }
    },
  });
}

// Update Profile (name)
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => authApi.updateProfile(name),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, updatedUser);
    },
    onError: (error: any) => {
      console.error('Failed to update profile:', error);
      Alert.alert(
        'Couldn’t save',
        error.message || 'Unable to update your profile. Please try again.',
      );
    },
  });
}

// Delete Account
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      forgetPushToken(); // the server deleted the device with the account
      resetUserData(queryClient, null);
      router.replace('/(auth)/login');

      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted.',
      );
    },
    onError: (error: any) => {
      console.error('Failed to delete account:', error);

      if (error.code === 'NotAuthorizedException') {
        Alert.alert(
          'Session Expired',
          'Please sign in again to delete your account.',
        );
      } else {
        Alert.alert(
          'Delete Failed',
          error.message || 'Unable to delete account. Please try again.',
        );
      }
    },
  });
}

import { CodeStep } from '@/components/auth/CodeStep';
import { useForgotPassword, useVerifyResetCode } from '@/hooks/useAuth';
import { resetSession } from '@/lib/resetSession';
import { router, useLocalSearchParams } from 'expo-router';

/** Password reset, step 1 of 2: the emailed code. */
export default function ResetCodeScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const verifyCode = useVerifyResetCode();
  const resendCode = useForgotPassword();

  return (
    <CodeStep
      title="Enter your code"
      email={email}
      submitLabel="Continue"
      submitting={verifyCode.isPending}
      onSubmit={async (code) => {
        try {
          const { resetToken } = await verifyCode.mutateAsync({ email, code });
          resetSession.set({ email, token: resetToken });
        } catch {
          return false; // useVerifyResetCode already explained why
        }
        // Replace: the code is used up, so Back from the next step returns to "Reset your password".
        router.replace('/new-password');
        return true;
      }}
      resending={resendCode.isPending}
      onResend={async () => {
        try {
          await resendCode.mutateAsync(email);
          return true;
        } catch {
          return false;
        }
      }}
      onDifferentEmail={() =>
        router.canGoBack()
          ? router.back()
          : router.replace({ pathname: '/forgot-password', params: { email } })
      }
    />
  );
}

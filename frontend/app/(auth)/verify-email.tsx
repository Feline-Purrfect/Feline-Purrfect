import { CodeStep } from '@/components/auth/CodeStep';
import { useConfirmSignUp, useResendConfirmationCode } from '@/hooks/useAuth';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

export default function VerifyEmailScreen() {
  // `resend=1` comes from Log in with an unverified account: send a fresh code on arrival.
  const { email = '', resend } = useLocalSearchParams<{
    email: string;
    resend?: string;
  }>();
  const autoResent = useRef(false);

  const confirmSignUp = useConfirmSignUp();
  const resendCode = useResendConfirmationCode();

  useEffect(() => {
    if (resend === '1' && email && !autoResent.current) {
      autoResent.current = true;
      resendCode.mutate(email);
    }
  }, [resend, email, resendCode]);

  return (
    <CodeStep
      title="Check your email"
      email={email}
      submitLabel="Verify email"
      submitting={confirmSignUp.isPending}
      onSubmit={async (code) => {
        try {
          await confirmSignUp.mutateAsync({ email, code });
        } catch {
          return false; // useConfirmSignUp already explained why
        }
        // Back to the Log in screen at the bottom of the stack, with the email filled in.
        if (router.canDismiss()) router.dismissAll();
        router.replace({
          pathname: '/login',
          params: { email, verified: '1' },
        });
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
      onDifferentEmail={() => router.replace('/signup')}
    />
  );
}

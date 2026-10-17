import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Button, Field, Text } from '@/components/ds';
import { useConfirmForgotPassword, useSignIn } from '@/hooks/useAuth';
import { passwordRules } from '@/lib/password';
import { resetSession } from '@/lib/resetSession';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

/** Password reset, step 2 of 2: the new password (twice), then straight into the app. */
export default function NewPasswordScreen() {
  const [session] = useState(resetSession.get);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const confirmRef = useRef<TextInput>(null);

  const resetPassword = useConfirmForgotPassword();
  const signIn = useSignIn();

  // The token is single-purpose: drop it when leaving this screen, whatever the outcome.
  useEffect(() => () => resetSession.clear(), []);

  const rules = passwordRules(password, confirm);
  const ready = rules.every((r) => r.ok);
  const busy = resetPassword.isPending || signIn.isPending;

  if (!session) {
    // Reached without a verified code (e.g. the app was restarted mid-reset).
    return (
      <AuthLayout
        title="Start again"
        subtitle="Your reset session has ended. Request a new code to choose a new password."
      >
        <Button
          title="Send a new code"
          onPress={() => router.replace('/forgot-password')}
          className="h-[52px]"
        />
      </AuthLayout>
    );
  }

  // Log straight in with the new password; useSignIn navigates to Home on success.
  // Awaited rather than passed as mutate callbacks: navigating unmounts this screen, and React Query
  // drops per-call callbacks once their component is gone.
  const logIn = async () => {
    if (!session) return;
    try {
      await signIn.mutateAsync({ email: session.email, password });
      Alert.alert(
        'Password reset',
        'Your password was changed successfully and you’re now logged in.',
      );
    } catch {
      if (router.canDismiss()) router.dismissAll();
      router.replace({ pathname: '/login', params: { email: session.email } });
      Alert.alert(
        'Password reset',
        'Your password was changed successfully. Log in with your new password.',
      );
    }
  };

  const submit = () => {
    if (!ready || busy) return;
    resetPassword.mutate(
      { resetToken: session.token, newPassword: password },
      {
        onSuccess: () => {
          resetSession.clear();
          void logIn();
        },
      },
    );
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          For{' '}
          <Text className="font-body-semibold text-body text-ink">
            {session.email}
          </Text>
          .
        </>
      }
    >
      <View className="gap-[18px]">
        <Field label="New password">
          <PasswordField
            value={password}
            onChangeText={setPassword}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
            textContentType="newPassword"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            submitBehavior="submit"
            accessibilityLabel="New password"
          />
        </Field>

        <Field label="Confirm new password">
          <PasswordField
            ref={confirmRef}
            value={confirm}
            onChangeText={setConfirm}
            visible={showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="Confirm new password"
          />
        </Field>

        <PasswordRules rules={rules} />

        <Button
          title="Save and log in"
          onPress={submit}
          disabled={!ready}
          loading={busy}
          className="h-[52px] mt-1.5"
        />
      </View>
    </AuthLayout>
  );
}

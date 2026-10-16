import { AuthLayout, FooterPrompt } from '@/components/auth/AuthLayout';
import { Button, Field, TextField } from '@/components/ds';
import { useAuth, useForgotPassword } from '@/hooks/useAuth';
import { isEmail } from '@/lib/password';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function ForgotPasswordScreen() {
  // Prefilled from Log in (what was typed) or Change password (the signed-in account).
  const params = useLocalSearchParams<{ email?: string }>();
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState(params.email ?? '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const { mutate: forgotPassword, isPending } = useForgotPassword();

  const submit = () => {
    if (!email.trim() || isPending) return;
    if (!isEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    const normalized = email.trim().toLowerCase();
    // The API answers the same whether or not the account exists, so always move on.
    forgotPassword(normalized, {
      onSuccess: () =>
        router.push({ pathname: '/reset-code', params: { email: normalized } }),
    });
  };

  const back = () =>
    router.canGoBack() ? router.back() : router.replace('/login');

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we’ll send you a 6-digit code."
      footer={
        <FooterPrompt
          prompt="Remembered it?"
          action={isAuthenticated ? 'Go back' : 'Log in'}
          onPress={back}
        />
      }
    >
      <View className="gap-[18px]">
        <Field label="Email" error={emailError}>
          <TextField
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={submit}
            invalid={!!emailError}
            accessibilityLabel="Email"
          />
        </Field>
        <Button
          title="Send code"
          onPress={submit}
          disabled={!email.trim()}
          loading={isPending}
          className="h-[52px] mt-1.5"
        />
      </View>
    </AuthLayout>
  );
}

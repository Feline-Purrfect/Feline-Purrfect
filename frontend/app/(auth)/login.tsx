import {
  AuthBanner,
  AuthLayout,
  FooterPrompt,
} from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { Button, Field, Text, TextField } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useSignIn } from '@/hooks/useAuth';
import { isEmail } from '@/lib/password';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

export default function LoginScreen() {
  // `verified=1` + `email` arrive from Verify email; `email` alone from a reset that couldn't log in.
  const params = useLocalSearchParams<{ email?: string; verified?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const { mutate: signIn, isPending } = useSignIn();

  const ready = email.trim().length > 0 && password.length > 0;

  const submit = () => {
    if (!ready || isPending) return;
    if (!isEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setFailed(false);
    // Success navigates (useSignIn). A wrong email/password is shown inline; other errors alert.
    signIn(
      { email: email.trim().toLowerCase(), password },
      {
        onError: (error: any) => {
          if (error.code === 'NotAuthorizedException') setFailed(true);
        },
      },
    );
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your cats and today’s logs."
      footer={
        <FooterPrompt
          prompt="New to Feline Purrfect?"
          action="Create an account"
          onPress={() => router.push('/signup')}
        />
      }
    >
      <View className="gap-[18px]">
        {failed ? (
          <AuthBanner
            tone="danger"
            icon={
              <Feather
                name="alert-circle"
                size={18}
                color={Colors.dangerInk}
                style={{ marginTop: 1 }}
              />
            }
          >
            That email and password don’t match. Try again or reset your
            password.
          </AuthBanner>
        ) : params.verified === '1' ? (
          <AuthBanner
            tone="success"
            icon={
              <Feather
                name="check-circle"
                size={18}
                color={Colors.primary.pressed}
                style={{ marginTop: 1 }}
              />
            }
          >
            Your email is verified. Log in to get started.
          </AuthBanner>
        ) : null}

        <Field label="Email" error={emailError}>
          <TextField
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
              setFailed(false);
            }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            invalid={!!emailError || failed}
            accessibilityLabel="Email"
          />
        </Field>

        <View className="gap-1.5">
          <View className="flex-row items-baseline justify-between">
            <Text variant="label">Password</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/forgot-password',
                  params: email.trim()
                    ? { email: email.trim().toLowerCase() }
                    : {},
                })
              }
              accessibilityRole="link"
              hitSlop={8}
              className="py-1"
            >
              <Text variant="label" className="text-primary">
                Forgot password?
              </Text>
            </Pressable>
          </View>
          <PasswordField
            ref={passwordRef}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setFailed(false);
            }}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            invalid={failed}
            accessibilityLabel="Password"
          />
        </View>

        <Button
          title="Log in"
          onPress={submit}
          disabled={!ready}
          loading={isPending}
          className="h-[52px] mt-1.5"
        />
      </View>
    </AuthLayout>
  );
}

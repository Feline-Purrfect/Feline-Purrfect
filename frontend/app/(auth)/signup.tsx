import { AuthLayout, FooterPrompt } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Button, Field, Text, TextField } from '@/components/ds';
import { useSignUp } from '@/hooks/useAuth';
import { openLegal } from '@/lib/legal';
import { isEmail, passwordRules } from '@/lib/password';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { mutate: signUp, isPending } = useSignUp();

  const rules = passwordRules(password, confirm);
  const ready =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    rules.every((r) => r.ok);

  const submit = () => {
    if (!ready || isPending) return;
    if (!isEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    // Errors are shown by useSignUp's onError.
    signUp(
      { email: normalizedEmail, password, name: name.trim() },
      {
        onSuccess: () =>
          router.push({
            pathname: '/verify-email',
            params: { email: normalizedEmail },
          }),
      },
    );
  };

  const toLogin = () =>
    router.canGoBack() ? router.back() : router.replace('/login');

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free. Keeps your cats’ logs and reminders in one place."
      footer={
        <FooterPrompt
          prompt="Already have an account?"
          action="Log in"
          onPress={toLogin}
        />
      }
    >
      <View className="gap-[18px]">
        <Field label="Your name">
          <TextField
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            submitBehavior="submit"
            accessibilityLabel="Your name"
          />
        </Field>

        <Field label="Email" error={emailError}>
          <TextField
            ref={emailRef}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setEmailError(null);
            }}
            onBlur={() =>
              email.trim() &&
              !isEmail(email) &&
              setEmailError('Enter a valid email address.')
            }
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            invalid={!!emailError}
            accessibilityLabel="Email"
          />
        </Field>

        <Field label="Password">
          <PasswordField
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            submitBehavior="submit"
            accessibilityLabel="Password"
          />
        </Field>

        <Field label="Confirm password">
          <PasswordField
            ref={confirmRef}
            value={confirm}
            onChangeText={setConfirm}
            visible={showPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="Confirm password"
          />
        </Field>

        <PasswordRules rules={rules} />

        <Button
          title="Create account"
          onPress={submit}
          disabled={!ready}
          loading={isPending}
          className="h-[52px] mt-1.5"
        />

        <Text variant="caption" className="text-center leading-[19px] px-2">
          By creating an account, you agree to our{' '}
          <Text
            onPress={() => openLegal('terms')}
            accessibilityRole="link"
            suppressHighlighting
            className="font-body-semibold text-caption text-primary"
          >
            Terms of Use
          </Text>{' '}
          and acknowledge our{' '}
          <Text
            onPress={() => openLegal('privacy')}
            accessibilityRole="link"
            suppressHighlighting
            className="font-body-semibold text-caption text-primary"
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </AuthLayout>
  );
}

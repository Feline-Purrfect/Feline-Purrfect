import { PasswordField } from '@/components/auth/PasswordField';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Button, Field, Text } from '@/components/ds';
import { useAuth, useChangePassword } from '@/hooks/useAuth';
import { passwordRules } from '@/lib/password';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { user } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { mutate: changePassword, isPending } = useChangePassword();

  const rules = passwordRules(next, confirm, cur);
  const ready = cur.length > 0 && rules.every((r) => r.ok);

  const submit = () => {
    if (!ready || isPending) return;
    // Success/error alerts come from useChangePassword; here we only leave on success.
    changePassword(
      { oldPassword: cur, newPassword: next },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      className="flex-1 bg-canvas"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 4,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 36,
          gap: 24,
        }}
      >
        {/* Current */}
        <View className="gap-1.5">
          <Field label="Current password">
            <PasswordField
              value={cur}
              onChangeText={setCur}
              visible={showCur}
              onToggle={() => setShowCur((v) => !v)}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => nextRef.current?.focus()}
              submitBehavior="submit"
              accessibilityLabel="Current password"
            />
          </Field>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/forgot-password',
                params: user?.email ? { email: user.email } : {},
              })
            }
            accessibilityRole="link"
            hitSlop={8}
            className="self-start py-1"
          >
            <Text variant="label" className="text-primary">
              Forgot your password?
            </Text>
          </Pressable>
        </View>

        {/* New + confirm, with the rules right under them */}
        <View className="gap-4">
          <Field label="New password">
            <PasswordField
              ref={nextRef}
              value={next}
              onChangeText={setNext}
              visible={showNew}
              onToggle={() => setShowNew((v) => !v)}
              autoComplete="new-password"
              textContentType="newPassword"
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
              visible={showNew}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={submit}
              accessibilityLabel="Confirm new password"
            />
          </Field>

          <PasswordRules rules={rules} />
        </View>

        <Button
          title="Update password"
          onPress={submit}
          disabled={!ready}
          loading={isPending}
          className="h-[52px]"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

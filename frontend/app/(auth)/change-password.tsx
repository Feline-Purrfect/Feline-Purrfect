import { Button, Field, Text, TextField } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useChangePassword } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { forwardRef, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Password input with a show/hide button inside the field. */
const PasswordField = forwardRef<
  TextInput,
  TextInputProps & { visible: boolean; onToggle?: () => void }
>(function PasswordField({ visible, onToggle, ...rest }, ref) {
  return (
    <View className="justify-center">
      <TextField
        ref={ref}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        className={onToggle ? 'pr-14' : undefined}
        {...rest}
      />
      {onToggle && (
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          className="absolute right-0.5 w-11 h-11 items-center justify-center"
        >
          <Feather
            name={visible ? 'eye-off' : 'eye'}
            size={20}
            color={Colors.ink.muted}
          />
        </Pressable>
      )}
    </View>
  );
});

// Mirrors the server's rule (backend/src/routes/auth.js → assertStrongPassword), so the button only
// enables for a password the API will accept.
const rulesFor = (cur: string, next: string, confirm: string) => [
  {
    label: 'At least 8 characters',
    ok: next.length >= 8 && next.length <= 128,
  },
  {
    label: 'Upper- and lower-case letters',
    ok: /[a-z]/.test(next) && /[A-Z]/.test(next),
  },
  {
    label: 'A number and a symbol',
    ok: /\d/.test(next) && /[^A-Za-z0-9]/.test(next),
  },
  {
    label: 'Different from your current password',
    ok: next.length > 0 && next !== cur,
  },
  {
    label: 'Both new passwords match',
    ok: confirm.length > 0 && confirm === next,
  },
];

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const { mutate: changePassword, isPending } = useChangePassword();

  const rules = rulesFor(cur, next, confirm);
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
            onPress={() => router.push('/forgot-password')}
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

          <View
            accessibilityLiveRegion="polite"
            className="bg-surface border border-line rounded-cta px-4 py-3.5 gap-2.5"
          >
            {rules.map((r) => (
              <View
                key={r.label}
                accessible
                accessibilityLabel={`${r.label}, ${r.ok ? 'done' : 'not yet'}`}
                className="flex-row items-center gap-2.5"
              >
                <View
                  className={cn(
                    'w-5 h-5 rounded-full items-center justify-center',
                    r.ok ? 'bg-primary' : 'border-[1.5px] border-[#C4BEB3]',
                  )}
                >
                  {r.ok && (
                    <Feather name="check" size={12} color={Colors.surface} />
                  )}
                </View>
                <Text
                  className={cn(
                    'font-body text-label',
                    r.ok ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  {r.label}
                </Text>
              </View>
            ))}
          </View>
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

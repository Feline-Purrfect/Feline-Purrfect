import { AuthLayout } from '@/components/auth/AuthLayout';
import { CodeInput, CodeInputHandle } from '@/components/auth/CodeInput';
import { Button, Text } from '@/components/ds';
import { useCooldown } from '@/hooks/useCooldown';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * "Check your email" step shared by Verify email and the password reset: six code boxes, a submit
 * button, a resend countdown, and the spam / different-email help pinned to the bottom.
 * `onSubmit` resolves true on success; on false the boxes clear and the keyboard comes back.
 */
export function CodeStep({
  title,
  email,
  submitLabel,
  submitting,
  onSubmit,
  onResend,
  resending,
  onDifferentEmail,
}: {
  title: string;
  email: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (code: string) => Promise<boolean>;
  onResend: () => Promise<boolean>;
  resending: boolean;
  onDifferentEmail: () => void;
}) {
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<CodeInputHandle>(null);
  const cooldown = useCooldown(RESEND_SECONDS);

  const submit = async (value = code) => {
    if (value.length !== CODE_LENGTH || submitting) return;
    const ok = await onSubmit(value);
    if (!ok) {
      setInvalid(true);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  const resend = async () => {
    if (cooldown.left > 0 || resending) return;
    if (await onResend()) {
      cooldown.start();
      setResent(true);
      setInvalid(false);
      setCode('');
    }
  };

  return (
    <AuthLayout
      title={title}
      subtitle={
        <>
          We sent a 6-digit code to{' '}
          <Text className="font-body-semibold text-body text-ink">{email}</Text>
          .
        </>
      }
      footer={
        <View className="items-center gap-1.5">
          <Text variant="caption" className="text-label text-center">
            Can’t find it? Check your spam folder.
          </Text>
          <Pressable
            onPress={onDifferentEmail}
            accessibilityRole="link"
            hitSlop={8}
            className="py-1.5"
          >
            <Text className="font-body-bold text-label text-primary">
              Use a different email
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-2.5">
        <Text variant="label" nativeID="code-label">
          Verification code
        </Text>
        <CodeInput
          ref={inputRef}
          value={code}
          onChange={(c) => {
            setCode(c);
            if (invalid) setInvalid(false);
          }}
          onComplete={submit}
          length={CODE_LENGTH}
          invalid={invalid}
          editable={!submitting}
          autoFocus
        />
        {invalid ? (
          <Text
            variant="caption"
            className="text-danger"
            accessibilityLiveRegion="polite"
          >
            That code didn’t work. Try again or send a new one.
          </Text>
        ) : resent ? (
          <Text variant="caption" accessibilityLiveRegion="polite">
            We sent a new code. Use the latest email.
          </Text>
        ) : null}
      </View>

      <View className="gap-3">
        <Button
          title={submitLabel}
          onPress={() => submit()}
          disabled={code.length !== CODE_LENGTH}
          loading={submitting}
          className="h-[52px]"
        />
        <Pressable
          onPress={resend}
          disabled={cooldown.left > 0 || resending}
          accessibilityRole="button"
          accessibilityState={{ disabled: cooldown.left > 0 || resending }}
          className="h-11 items-center justify-center"
        >
          <Text
            className={
              cooldown.left > 0 || resending
                ? 'font-body-semibold text-body text-ink-muted'
                : 'font-body-semibold text-body text-primary'
            }
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {resending
              ? 'Sending…'
              : cooldown.left > 0
                ? `Resend code in ${cooldown.label}`
                : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

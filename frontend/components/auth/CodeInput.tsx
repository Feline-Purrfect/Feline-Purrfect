import { Text } from '@/components/ds';
import { cn } from '@/lib/cn';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

export interface CodeInputHandle {
  focus: () => void;
}

/**
 * Six digit boxes backed by one hidden TextInput, so typing, paste and the keyboard's
 * one-time-code suggestion all work. Calls `onComplete` once every box is filled.
 */
export const CodeInput = forwardRef<
  CodeInputHandle,
  {
    value: string;
    onChange: (code: string) => void;
    onComplete?: (code: string) => void;
    length?: number;
    invalid?: boolean;
    editable?: boolean;
    autoFocus?: boolean;
    accessibilityLabel?: string;
  }
>(function CodeInput(
  {
    value,
    onChange,
    onComplete,
    length = 6,
    invalid,
    editable = true,
    autoFocus,
    accessibilityLabel = 'Verification code',
  },
  ref,
) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const change = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length && digits !== value) onComplete?.(digits);
  };

  const active = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => input.current?.focus()}
      accessible={false}
      className="relative"
    >
      <View className="flex-row gap-2">
        {Array.from({ length }, (_, i) => {
          const isActive = focused && i === active;
          return (
            <View
              key={i}
              className={cn(
                'flex-1 h-[60px] rounded-tile bg-surface items-center justify-center',
                invalid
                  ? 'border-[1.5px] border-danger'
                  : isActive
                    ? 'border-2 border-primary'
                    : 'border border-line-strong',
              )}
            >
              <Text
                className="font-body-bold text-[24px] leading-[30px] text-ink"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {value[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        ref={input}
        value={value}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`${length} digits`}
        className="absolute inset-0"
        style={{ opacity: 0 }}
      />
    </Pressable>
  );
});

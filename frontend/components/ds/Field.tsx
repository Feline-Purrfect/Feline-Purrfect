import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { forwardRef, ReactNode, useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';

/** Label + control + optional hint/error, stacked with 6px gaps. */
export function Field({ label, error, hint, children, className }: {
  label?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('gap-1.5', className)}>
      {label ? <Text variant="label">{label}</Text> : null}
      {children}
      {error ? (
        <Text variant="caption" className="text-danger" accessibilityLiveRegion="polite">{error}</Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

export const inputBox = 'h-12 bg-surface border rounded-field px-3.5';

interface TextFieldProps extends TextInputProps {
  invalid?: boolean;
  className?: string;
}

/** 48px input: warm border, blue border while focused, red when invalid. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { invalid, className, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={Colors.ink.faint}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      className={cn(
        inputBox,
        'font-body-medium text-input text-ink',
        invalid ? 'border-danger' : focused ? 'border-primary' : 'border-line-strong',
        className,
      )}
      {...rest}
    />
  );
});

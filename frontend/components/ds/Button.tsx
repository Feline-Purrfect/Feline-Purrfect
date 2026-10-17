import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'pill' | 'pillOutline';

const box: Record<Variant, string> = {
  primary: 'h-[54px] rounded-cta bg-primary active:bg-primary-pressed px-5',               // main CTA, full width
  secondary: 'h-12 rounded-tile border border-line-strong bg-transparent active:bg-fill px-4', // calm secondary action
  pill: 'h-11 rounded-full bg-primary active:bg-primary-pressed pl-3 pr-4',                 // header action ("Add cat")
  pillOutline: 'h-10 rounded-full border border-line-strong bg-surface active:bg-fill px-4', // inline ("Edit", "Add photo")
};

const label: Record<Variant, string> = {
  primary: 'font-body-bold text-input text-white',
  secondary: 'font-body-semibold text-body text-ink',
  pill: 'font-body-bold text-body text-white',
  pillOutline: 'font-body-semibold text-label text-ink',
};

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({ title, variant = 'primary', icon, loading, disabled, className, textClassName, ...rest }: ButtonProps) {
  const onDark = variant === 'primary' || variant === 'pill';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      className={cn('flex-row items-center justify-center', box[variant], (disabled || loading) && 'opacity-60', className)}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={onDark ? '#FFFFFF' : Colors.ink.DEFAULT} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={cn(label[variant], textClassName)}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

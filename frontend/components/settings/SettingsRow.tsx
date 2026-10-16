import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import Feather from '@expo/vector-icons/Feather';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type FeatherName = ComponentProps<typeof Feather>['name'];

/** Uppercase group label + a white card of rows. */
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text
        accessibilityRole="header"
        className="ml-1 font-body-bold text-caption uppercase tracking-[0.8px] text-ink-muted"
      >
        {title + 'hihi'}
      </Text>
      <View className="bg-surface border border-line rounded-card overflow-hidden">
        {children}
      </View>
    </View>
  );
}

/** 56px row: icon, label, optional value, trailing chevron (or an "opens outside the app" arrow). */
export function SettingsRow({
  icon,
  label,
  value,
  external,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  value?: string;
  external?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      className="min-h-14 px-4 flex-row items-center gap-3.5 active:bg-fill"
    >
      <Feather name={icon} size={20} color={Colors.gray.dark} />
      <Text className="flex-1 font-body-medium text-input text-ink">
        {label}
      </Text>
      {value ? (
        <Text variant="caption" className="text-label">
          {value}
        </Text>
      ) : null}
      <Feather
        name={external ? 'external-link' : 'chevron-right'}
        size={16}
        color={Colors.ink.muted}
      />
    </Pressable>
  );
}

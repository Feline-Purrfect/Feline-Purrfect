import { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from './Text';

/** Section title with an optional right-hand element (badge, count, link). Baseline-aligned. */
export function SectionHeader({ title, right, nativeID }: { title: string; right?: ReactNode; nativeID?: string }) {
  return (
    <View className="flex-row items-end justify-between">
      <Text variant="heading" accessibilityRole="header" nativeID={nativeID}>{title}</Text>
      {right}
    </View>
  );
}

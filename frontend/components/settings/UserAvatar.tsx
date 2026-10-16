import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { Text, View } from 'react-native';

/** The user's initial on the soft brand blue. Size comes from `className`; `initialSize` scales the letter. */
export function UserAvatar({ name, className, initialSize = 22 }: { name?: string | null; className?: string; initialSize?: number }) {
  const initial = name?.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('rounded-full bg-primary-soft items-center justify-center overflow-hidden', className)}
    >
      <Text
        style={{ color: Colors.primary.pressed, fontSize: initialSize, lineHeight: initialSize * 1.15 }}
        className="font-display"
      >
        {initial}
      </Text>
    </View>
  );
}

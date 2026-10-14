import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';
import { Text } from './Text';

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      className="flex-row items-center gap-2.5 min-h-11"
    >
      <View
        className={cn('w-5 h-5 rounded-[5px] border items-center justify-center', checked ? 'bg-primary border-primary' : 'bg-surface border-line-strong')}
      >
        {checked && <Feather name="check" size={14} color={Colors.surface} />}
      </View>
      <Text variant="body" className="text-label">{label}</Text>
    </Pressable>
  );
}

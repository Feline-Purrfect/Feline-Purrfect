import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, TextInput, View } from 'react-native';

export const MAX_QUESTION = 1000;

/** Growing text field with a round send button. */
export function AskComposer({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const canSend = !disabled && value.trim().length > 0;
  return (
    <View className="flex-row items-end gap-2">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.ink.faint}
        multiline
        maxLength={MAX_QUESTION}
        accessibilityLabel="Your question"
        className="flex-1 min-h-[46px] max-h-[140px] bg-surface border border-line-strong rounded-[23px] px-4 pt-[12px] pb-[12px] font-body text-input text-ink"
        style={{ textAlignVertical: 'top' }}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send"
        accessibilityState={{ disabled: !canSend }}
        className={cn(
          'w-[46px] h-[46px] rounded-full items-center justify-center',
          canSend ? 'bg-primary active:bg-primary-pressed' : 'bg-fill',
        )}
      >
        <Feather
          name="arrow-up"
          size={22}
          color={canSend ? Colors.surface : Colors.ink.faint}
        />
      </Pressable>
    </View>
  );
}

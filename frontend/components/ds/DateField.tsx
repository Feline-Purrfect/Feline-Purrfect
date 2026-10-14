import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { formatLongDate, fromYmd, toYmd } from '@/lib/dates';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { inputBox } from './Field';
import { Text } from './Text';

interface DateFieldProps {
  value: string | null; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  invalid?: boolean;
  accessibilityLabel: string;
}

/**
 * Looks like a text input; opens the native picker.
 * Android: the system dialog. iOS: a bottom sheet with the inline calendar and a Done button.
 */
export function DateField({ value, onChange, placeholder = 'Select', minimumDate, maximumDate, invalid, accessibilityLabel }: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? fromYmd(value) : maximumDate ?? new Date());

  const open = () => {
    const current = value ? fromYmd(value) : maximumDate ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(toYmd(date));
        },
      });
    } else {
      setDraft(current);
      setIosOpen(true);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: value ? formatLongDate(value) : 'Not set' }}
        onPress={open}
        className={cn(inputBox, 'justify-center px-2.5', invalid ? 'border-danger' : 'border-line-strong')}
      >
        <Text numberOfLines={1} className={cn('text-body font-body-medium', value ? 'text-ink' : 'text-ink-faint')}>
          {value ? formatLongDate(value, { short: true }) : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable className="flex-1 bg-black/30" onPress={() => setIosOpen(false)} accessibilityLabel="Close" />
          <View className="bg-surface rounded-t-sheet px-4 pt-3 pb-10">
            <View className="flex-row justify-between items-center h-11">
              <Pressable onPress={() => setIosOpen(false)} hitSlop={8}>
                <Text variant="bodyStrong" className="text-ink-muted">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { onChange(toYmd(draft)); setIosOpen(false); }}
                hitSlop={8}
              >
                <Text variant="bodyStrong" className="text-primary font-body-bold">Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              accentColor={Colors.primary.DEFAULT}
              themeVariant="light"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_, d) => d && setDraft(d)}
            />
          </View>
        </Modal>
      )}
    </>
  );
}

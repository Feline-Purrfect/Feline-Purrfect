import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

/**
 * Opens the native time picker. Android: the system clock dialog. iOS: a bottom sheet with the wheel
 * and a Done button (same pattern as DateField). Returns an `open(current)` function and the sheet.
 */
export function useTimePicker(onPick: (value: Date) => void) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());

  const open = (current: Date) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'time',
        onValueChange: (_, date) => {
          onPick(date);
        },
      });
    } else {
      setDraft(current);
      setIosOpen(true);
    }
  };

  const sheet =
    Platform.OS === 'ios' ? (
      <Modal
        visible={iosOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIosOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/30"
          onPress={() => setIosOpen(false)}
          accessibilityLabel="Close"
        />
        <View className="bg-surface rounded-t-sheet px-4 pt-3 pb-10">
          <View className="flex-row justify-between items-center h-11">
            <Pressable onPress={() => setIosOpen(false)} hitSlop={8}>
              <Text variant="bodyStrong" className="text-ink-muted">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onPick(draft);
                setIosOpen(false);
              }}
              hitSlop={8}
            >
              <Text
                variant="bodyStrong"
                className="text-primary font-body-bold"
              >
                Done
              </Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            accentColor={Colors.primary.DEFAULT}
            themeVariant="light"
            onValueChange={(_, d) => setDraft(d)}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </Modal>
    ) : null;

  return { open, sheet };
}

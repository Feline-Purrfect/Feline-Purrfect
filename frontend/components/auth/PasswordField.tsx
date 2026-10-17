import { TextField } from '@/components/ds';
import { Colors } from '@/constants/colors';
import Feather from '@expo/vector-icons/Feather';
import { forwardRef } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';

/** Password input with a show/hide button inside the field (omit `onToggle` for no button). */
export const PasswordField = forwardRef<
  TextInput,
  TextInputProps & {
    visible: boolean;
    onToggle?: () => void;
    invalid?: boolean;
  }
>(function PasswordField({ visible, onToggle, ...rest }, ref) {
  return (
    <View className="justify-center">
      <TextField
        ref={ref}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        className={onToggle ? 'pr-14' : undefined}
        {...rest}
      />
      {onToggle && (
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          className="absolute right-0.5 w-11 h-11 items-center justify-center"
        >
          <Feather
            name={visible ? 'eye-off' : 'eye'}
            size={20}
            color={Colors.ink.muted}
          />
        </Pressable>
      )}
    </View>
  );
});

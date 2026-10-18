import { Button, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import Feather from '@expo/vector-icons/Feather';
import { ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FeatherName = ComponentProps<typeof Feather>['name'];

function Point({ icon, children }: { icon: FeatherName; children: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="w-8 h-8 rounded-full bg-primary-soft items-center justify-center">
        <Feather name={icon} size={16} color={Colors.primary.pressed} />
      </View>
      <Text className="flex-1 font-body text-body leading-[22px] text-ink-soft">
        {children}
      </Text>
    </View>
  );
}

/**
 * Explicit permission before anything is sent to the AI service (App Store guideline 5.1.2(i)):
 * names the provider, says exactly what is sent, and says how to turn it off.
 */
export function ConsentSheet({
  visible,
  loading,
  onAllow,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  onAllow: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40"
        onPress={onClose}
        accessibilityLabel="Not now"
      />
      <View
        accessibilityViewIsModal
        className="bg-canvas rounded-t-sheet px-5 pt-2.5 max-h-[85%]"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="self-center w-10 h-[5px] rounded-full bg-[#D3CCC0] mb-3" />
        <ScrollView
          contentContainerStyle={{ gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            accessibilityRole="header"
            className="font-display text-[24px] leading-7 text-ink"
          >
            Before you ask
          </Text>
          <Point icon="cpu">
            Ask is powered by Claude, an AI model made by Anthropic. Your
            questions are sent to Anthropic to write the answers.
          </Point>
          <Point icon="file-text">
            In a chat about one of your cats, Ask also sends that cat’s profile
            and logs: usually the last 30 days, and older days when a question
            needs them. Your notes are included.
          </Point>
          <Point icon="image">Photos are never sent.</Point>
          <Point icon="archive">
            Your chats are saved in your account so you can come back to them.
            You can delete any chat, and turn sharing off anytime in Settings.
          </Point>
          <Point icon="heart">
            Ask can be wrong and isn’t a vet. For anything worrying, call your
            vet.
          </Point>
          <View className="gap-2 mt-1">
            <Button
              title="Allow and continue"
              onPress={onAllow}
              loading={loading}
              className="h-[52px]"
            />
            <Button
              title="Not now"
              variant="secondary"
              onPress={onClose}
              disabled={loading}
              className="h-[52px] rounded-cta bg-surface"
              textClassName="text-input"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

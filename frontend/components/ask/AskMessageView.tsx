import { RichText } from '@/components/ask/RichText';
import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { formatShortDay } from '@/lib/dates';
import { AskMessage } from '@/types/ask';
import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

/** The owner's question: a blue bubble on the right. */
export function UserBubble({
  text,
  pending,
}: {
  text: string;
  pending?: boolean;
}) {
  return (
    <View className="self-end max-w-[85%]">
      <View
        className="bg-primary rounded-[20px] rounded-br-[6px] px-4 py-2.5"
        style={pending ? { opacity: 0.85 } : undefined}
      >
        <Text
          selectable
          className="font-body text-body leading-[22px] text-white"
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

/** While the answer is being written. */
export function ThinkingRow() {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel="Writing an answer"
      className="self-start flex-row items-center gap-2.5 bg-surface border border-line rounded-card px-4 py-3"
    >
      <ActivityIndicator size="small" color={Colors.ink.muted} />
      <Text variant="caption">Thinking…</Text>
    </View>
  );
}

function EmergencyCard() {
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-start gap-2.5 px-3.5 py-3 rounded-tile bg-danger-soft"
    >
      <Feather
        name="alert-triangle"
        size={18}
        color={Colors.dangerInk}
        style={{ marginTop: 1 }}
      />
      <Text className="flex-1 font-body-semibold text-label leading-5 text-danger-ink">
        This could be an emergency. Call your vet or an emergency clinic now,
        before reading on.
      </Text>
    </View>
  );
}

/** An answer: emergency card when flagged, the text, then which logs it used and a Report action. */
export function AnswerCard({
  message,
  onReport,
}: {
  message: AskMessage;
  onReport: (reason: string) => void;
}) {
  const ctx = message.context;

  const report = () =>
    Alert.alert(
      'Report this answer?',
      'Tell us what’s wrong. Reports help us make Ask safer.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Offensive', onPress: () => onReport('offensive') },
        {
          text: 'Wrong or unsafe',
          onPress: () => onReport('inaccurate_or_unsafe'),
        },
      ],
    );

  return (
    <View className="self-stretch gap-2">
      {message.emergency && <EmergencyCard />}
      <View className="bg-surface border border-line rounded-card px-4 py-3.5">
        <RichText text={message.content} />
      </View>
      <View className="flex-row items-center justify-between gap-3 px-1">
        <Text variant="micro" numberOfLines={1} className="flex-1 font-body">
          {ctx
            ? ctx.loggedDays > 0
              ? `Used ${ctx.catName}’s logs · ${formatShortDay(ctx.from)} – ${formatShortDay(ctx.to)}`
              : `No logs for ${ctx.catName} in the last 30 days`
            : ' '}
        </Text>
        {message.reported ? (
          <Text variant="micro">Reported</Text>
        ) : (
          <Pressable
            onPress={report}
            accessibilityRole="button"
            accessibilityLabel="Report this answer"
            hitSlop={10}
            className="flex-row items-center gap-1 py-1"
          >
            <Feather name="flag" size={12} color={Colors.ink.muted} />
            <Text variant="micro">Report</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

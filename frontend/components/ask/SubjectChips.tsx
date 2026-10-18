import { CatAvatar } from '@/components/cats/CatAvatar';
import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { AskSubject } from '@/types/ask';
import { CatResponse } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, ScrollView, View } from 'react-native';

/** "General" plus one chip per active cat. Picking one starts a new chat about it. */
export function SubjectChips({
  cats,
  value,
  onChange,
}: {
  cats: CatResponse[];
  value: AskSubject;
  onChange: (subject: AskSubject) => void;
}) {
  const chip = (on: boolean) =>
    cn(
      'h-10 flex-row items-center gap-2 rounded-full border pl-1.5 pr-3.5',
      on ? 'bg-primary-soft border-primary' : 'bg-surface border-line-strong',
    );
  const label = (on: boolean) =>
    cn(
      'text-label',
      on
        ? 'font-body-bold text-primary-pressed'
        : 'font-body-semibold text-ink',
    );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel="Ask about"
      contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
    >
      <Pressable
        onPress={() => onChange('general')}
        accessibilityRole="radio"
        accessibilityState={{ checked: value === 'general' }}
        className={chip(value === 'general')}
      >
        <View className="w-7 h-7 rounded-full bg-fill items-center justify-center">
          <Feather name="message-circle" size={15} color={Colors.gray.dark} />
        </View>
        <Text className={label(value === 'general')}>General</Text>
      </Pressable>
      {cats.map((cat) => {
        const on = value === cat.catId;
        return (
          <Pressable
            key={cat.catId}
            onPress={() => onChange(cat.catId)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`About ${cat.name}`}
            className={chip(on)}
          >
            <CatAvatar
              cat={cat}
              className="w-7 h-7 rounded-full"
              initialSize={13}
            />
            <Text numberOfLines={1} className={cn(label(on), 'max-w-[120px]')}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

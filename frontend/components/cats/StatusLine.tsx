import { CatStatus } from '@/lib/cats';
import { cn } from '@/lib/cn';
import { Text, View } from 'react-native';

const tone = {
  logged: { dot: 'bg-primary', text: 'text-primary' },
  attention: { dot: 'bg-attention', text: 'text-attention-text' },
  idle: { dot: 'bg-line-strong', text: 'text-ink-muted' },
};

export function StatusLine({ status }: { status: CatStatus }) {
  const t = tone[status.tone];
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn('w-[7px] h-[7px] rounded-full', t.dot)} />
      <Text numberOfLines={1} className={cn('font-body-semibold text-caption', t.text)}>{status.label}</Text>
    </View>
  );
}

import { Button } from '@/components/ds/Button';
import { Text } from '@/components/ds/Text';
import { View } from 'react-native';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = 'Something went wrong.', onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 bg-canvas items-center justify-center px-8 gap-4">
      <Text variant="body" className="text-center text-ink-soft">{message}</Text>
      {onRetry && <Button variant="secondary" title="Try again" onPress={onRetry} className="self-center" />}
    </View>
  );
}

import { Text, TouchableOpacity, View } from 'react-native';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = 'Unknown error occurred', onRetry }: ErrorViewProps) {
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-6">
      <Text className="text-red-600 text-center">{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} className="mt-4 bg-primary-500 px-6 py-3 rounded-xl">
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

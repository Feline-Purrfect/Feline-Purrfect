import { Colors } from '@/constants/colors';
import { ActivityIndicator, View } from 'react-native';

export function LoadingIndicator() {
  return (
    <View className="flex-1 bg-canvas items-center justify-center">
      <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
    </View>
  );
}

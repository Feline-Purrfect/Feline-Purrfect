import { Text } from '@/components/ds';
import { formatLongDate } from '@/lib/dates';
import { CatPhoto } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { Alert, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Full-screen photo with its date, and a delete action. */
export function PhotoViewer({ photo, onClose, onDelete }: {
  photo: CatPhoto | null;
  onClose: () => void;
  onDelete: (photo: CatPhoto) => void;
}) {
  const insets = useSafeAreaInsets();
  const confirmDelete = () => {
    if (!photo) return;
    Alert.alert('Delete this photo?', 'It will be removed from this cat’s photos.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(photo) },
    ]);
  };

  return (
    <Modal visible={!!photo} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        {photo?.url && (
          <Image source={{ uri: photo.url, cacheKey: `photo-${photo.photoId}` }} className="flex-1" contentFit="contain" />
        )}
        <View className="absolute left-0 right-0 flex-row justify-between px-4" style={{ top: insets.top + 8 }}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo" className="w-11 h-11 rounded-full bg-black/40 items-center justify-center">
            <Feather name="x" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={confirmDelete} accessibilityRole="button" accessibilityLabel="Delete photo" className="w-11 h-11 rounded-full bg-black/40 items-center justify-center">
            <Feather name="trash-2" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        {photo && (
          <View className="absolute left-0 right-0 items-center" style={{ bottom: insets.bottom + 20 }}>
            <Text variant="label" className="text-white">{formatLongDate(photo.takenOn)}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

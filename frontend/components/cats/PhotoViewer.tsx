import { Text } from '@/components/ds';
import { formatLongDate } from '@/lib/dates';
import { CatPhoto } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotoViewerProps {
  photos: CatPhoto[];
  /** Which photo to open at; null = closed. */
  index: number | null;
  onClose: () => void;
  /** Omit to hide the delete button. */
  onDelete?: (photo: CatPhoto) => void;
  /** Body of the delete confirmation. */
  deleteMessage?: string;
}

/**
 * Full-screen photo carousel: swipe between photos, pinch to zoom (iOS), "2 of 5" counter, date, delete.
 */
export function PhotoViewer({
  photos,
  index,
  onClose,
  onDelete,
  deleteMessage,
}: PhotoViewerProps) {
  const visible = index !== null && photos.length > 0;
  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      {/* Remount per open so the carousel starts at the tapped photo. */}
      {visible && (
        <Carousel
          key={index}
          photos={photos}
          start={Math.min(index!, photos.length - 1)}
          onClose={onClose}
          onDelete={onDelete}
          deleteMessage={deleteMessage}
        />
      )}
    </Modal>
  );
}

function Carousel({
  photos,
  start,
  onClose,
  onDelete,
  deleteMessage,
}: {
  photos: CatPhoto[];
  start: number;
  onClose: () => void;
  onDelete?: (p: CatPhoto) => void;
  deleteMessage?: string;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(start);
  const photo = photos[Math.min(current, photos.length - 1)];

  const confirmDelete = () => {
    if (!photo || !onDelete) return;
    Alert.alert(
      'Delete this photo?',
      deleteMessage ?? 'It will be removed from this cat’s photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(photo),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-black">
      <FlatList
        data={photos}
        keyExtractor={(p) => p.photoId}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onMomentumScrollEnd={(e) =>
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          // iOS ScrollView supports pinch-zoom natively; Android shows the photo fitted.
          <ScrollView
            style={{ width, height }}
            contentContainerStyle={{
              width,
              height,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            maximumZoomScale={Platform.OS === 'ios' ? 3 : 1}
            minimumZoomScale={1}
            bouncesZoom
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{
                uri: item.url ?? undefined,
                cacheKey: `photo-${item.photoId}`,
              }}
              style={{ width, height }}
              contentFit="contain"
              accessibilityLabel={`Photo from ${formatLongDate(item.takenOn)}`}
            />
          </ScrollView>
        )}
      />

      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close photos"
          className="w-11 h-11 rounded-full bg-black/40 items-center justify-center"
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
        {photos.length > 1 && (
          <Text
            variant="label"
            className="text-white"
            accessibilityLiveRegion="polite"
          >
            {current + 1} of {photos.length}
          </Text>
        )}
        {onDelete ? (
          <Pressable
            onPress={confirmDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete photo"
            className="w-11 h-11 rounded-full bg-black/40 items-center justify-center"
          >
            <Feather name="trash-2" size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View className="w-11" />
        )}
      </View>

      {photo && (
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: insets.bottom + 20 }}
          pointerEvents="none"
        >
          <Text variant="label" className="text-white">
            {formatLongDate(photo.takenOn)}
          </Text>
        </View>
      )}
    </View>
  );
}

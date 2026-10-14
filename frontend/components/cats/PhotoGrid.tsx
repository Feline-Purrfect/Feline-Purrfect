import { CatPhoto } from '@/types/cat';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

/** Square tiles, `columns` across, 6px gaps. Rows are padded so tiles keep their width. */
export function PhotoGrid({ photos, columns, onPress, max }: {
  photos: CatPhoto[];
  columns: number;
  onPress: (photo: CatPhoto) => void;
  max?: number;
}) {
  const shown = max ? photos.slice(0, max) : photos;
  const rows: CatPhoto[][] = [];
  for (let i = 0; i < shown.length; i += columns) rows.push(shown.slice(i, i + columns));

  return (
    <View className="gap-1.5">
      {rows.map((row, r) => (
        <View key={r} className="flex-row gap-1.5">
          {row.map((p) => (
            <Pressable key={p.photoId} onPress={() => onPress(p)} accessibilityRole="imagebutton" accessibilityLabel={`Photo from ${p.takenOn}`} className="flex-1">
              <Image source={{ uri: p.url ?? undefined, cacheKey: `photo-${p.photoId}` }} className="w-full aspect-square rounded-tile bg-fill" contentFit="cover" />
            </Pressable>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => <View key={`pad-${i}`} className="flex-1" />)}
        </View>
      ))}
    </View>
  );
}

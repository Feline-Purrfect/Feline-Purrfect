import { Colors } from '@/constants/colors';
import { CatPhoto } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

interface PhotoGridProps {
  photos: CatPhoto[];
  columns: number;
  onPress: (photo: CatPhoto, index: number) => void;
  max?: number;
  /** Adds an "Add" tile at the end, the same size as the photos. */
  onAdd?: () => void;
  adding?: boolean;
  gap?: number;
}

/**
 * Square tiles, `columns` across. Every cell is flex-1 with a square inside, so the "Add" tile and the
 * photos are always the same size — whether or not there are photos yet.
 */
export function PhotoGrid({
  photos,
  columns,
  onPress,
  max,
  onAdd,
  adding,
  gap = 6,
}: PhotoGridProps) {
  const shown = max ? photos.slice(0, max) : photos;
  const cells: (CatPhoto | 'add')[] = onAdd ? [...shown, 'add'] : shown;
  const rows: (CatPhoto | 'add')[][] = [];
  for (let i = 0; i < cells.length; i += columns)
    rows.push(cells.slice(i, i + columns));

  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} className="flex-row" style={{ gap }}>
          {row.map((cell, c) =>
            cell === 'add' ? (
              // The Pressable itself is the tile. Don't put `active:` classes on a plain View inside a
              // Pressable: NativeWind gives that View its own touch handling and it swallows the tap.
              <Pressable
                key="add"
                onPress={onAdd}
                disabled={adding}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                accessibilityState={{ busy: !!adding, disabled: !!adding }}
                hitSlop={4}
                className="flex-1 aspect-square rounded-tile border border-line-strong bg-surface items-center justify-center gap-1 active:bg-fill"
              >
                {adding ? (
                  <ActivityIndicator color={Colors.ink.muted} />
                ) : (
                  <Feather name="camera" size={18} color={Colors.ink.DEFAULT} />
                )}
                <Text className="font-body-semibold text-micro text-ink">
                  {adding ? 'Adding' : 'Add'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                key={cell.photoId}
                onPress={() => onPress(cell, r * columns + c)}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Photo from ${cell.takenOn}`}
                className="flex-1"
              >
                <Image
                  source={{
                    uri: cell.url ?? undefined,
                    cacheKey: `photo-${cell.photoId}`,
                  }}
                  className="w-full aspect-square rounded-tile bg-fill"
                  contentFit="cover"
                />
              </Pressable>
            ),
          )}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

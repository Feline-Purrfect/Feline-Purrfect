import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

type AvatarCat = { catId: string; name: string; photoUrl?: string | null; updatedAt?: string };

/** Stable tone per cat so the same cat always gets the same color. */
function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Colors.avatar[Math.abs(h) % Colors.avatar.length];
}

/**
 * The cat's photo, or its initial on a warm tone when there's no photo.
 * Size comes from `className` (e.g. "w-full aspect-square", "w-28 h-28 rounded-full").
 * `initialSize` scales the letter with the box.
 */
export function CatAvatar({ cat, className, initialSize = 40 }: { cat: AvatarCat; className?: string; initialSize?: number }) {
  if (cat.photoUrl) {
    return (
      <Image
        source={{ uri: cat.photoUrl, cacheKey: `cat-${cat.catId}-${cat.updatedAt ?? ''}` }}
        className={cn('bg-fill', className)}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`Photo of ${cat.name}`}
      />
    );
  }
  const tone = toneFor(cat.catId);
  return (
    <View className={cn('items-center justify-center overflow-hidden', className)} style={{ backgroundColor: tone.bg }}>
      <Text style={{ color: tone.ink, fontSize: initialSize, lineHeight: initialSize * 1.15 }} className="font-display">
        {cat.name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

import { CatAvatar } from '@/components/cats/CatAvatar';
import { PhotoGrid } from '@/components/cats/PhotoGrid';
import { PhotoViewer } from '@/components/cats/PhotoViewer';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Button, Card, Divider, SectionHeader, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useArchiveCat, useCat, useCatPhotos, useAddCatPhoto, useDeleteCat, useDeleteCatPhoto, useUnarchiveCat } from '@/hooks/useCats';
import { useDashboardAnalytics } from '@/hooks/useDashboard';
import { useImagePicker } from '@/hooks/useImagePicker';
import { useLogs } from '@/hooks/useLogs';
import { formatWeight, maskMicrochip, profileMeta } from '@/lib/cats';
import { cn } from '@/lib/cn';
import { formatLongDate, formatMonth, formatShortDay } from '@/lib/dates';
import { formatAmount, summarizeLog } from '@/lib/logs';
import { CatPhoto, CatResponse } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'overview' | 'photos' | 'records';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'photos', label: 'Photos' },
  { key: 'records', label: 'Records' },
];

export default function CatProfileScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>(tabParam && TABS.some((t) => t.key === tabParam) ? tabParam : 'overview');
  const [viewing, setViewing] = useState<number | null>(null);

  const { data: cat, isLoading, error, refetch } = useCat(id);
  const photos = useCatPhotos(id);
  const addPhoto = useAddCatPhoto();
  const deletePhoto = useDeleteCatPhoto();
  const { pickImage } = useImagePicker({ allowsEditing: false, quality: 0.7 });

  if (isLoading && !cat) return <LoadingIndicator />;
  if (!cat) return <ErrorView message={(error as any)?.message ?? 'This cat couldn’t be found.'} onRetry={() => refetch()} />;

  const archived = !!cat.archivedAt;
  const photoList = photos.data?.photos ?? [];
  const photoTotal = photos.data?.total ?? 0;

  const uploadPhoto = async () => {
    const uri = await pickImage();
    if (uri) addPhoto.mutate({ catId: cat.catId, uri });
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Cover photo */}
        <View className="h-80">
          <CatAvatar cat={cat} className="w-full h-full" initialSize={96} />
        </View>

        {/* Sheet */}
        <View className="-mt-6 bg-canvas rounded-t-sheet px-5 pt-6 gap-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text variant="hero" accessibilityRole="header">{cat.name}</Text>
              <Text variant="body" className="text-ink-muted">{profileMeta(cat)}</Text>
              {archived && <Text variant="caption">Archived {formatMonth(cat.archivedAt!)}</Text>}
            </View>
            <Button variant="pillOutline" title="Edit" onPress={() => router.push(`/my-cats/${cat.catId}/edit`)} />
          </View>

          {/* Tabs */}
          <View accessibilityRole="tablist" className="flex-row border-b border-line">
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => setTab(t.key)}
                  className="flex-1 h-[46px] items-center justify-center"
                >
                  <Text className={cn('text-body', on ? 'font-body-bold text-primary-pressed' : 'font-body-semibold text-ink-muted')}>{t.label}</Text>
                  {on && <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary" />}
                </Pressable>
              );
            })}
          </View>

          {tab === 'overview' && (
            <Overview
              cat={cat}
              photos={photoList}
              photoTotal={photoTotal}
              onOpenPhotos={() => setTab('photos')}
              onAddPhoto={uploadPhoto}
              uploading={addPhoto.isPending}
            />
          )}

          {tab === 'photos' && (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text variant="label" className="font-body text-ink-muted">
                  {photoTotal === 1 ? '1 photo' : `${photoTotal} photos`}
                </Text>
                <Button
                  variant="pillOutline"
                  title="Add photo"
                  icon={<Feather name="plus" size={16} color={Colors.ink.DEFAULT} />}
                  onPress={uploadPhoto}
                  loading={addPhoto.isPending}
                />
              </View>
              {photos.isLoading ? (
                <ActivityIndicator color={Colors.primary.DEFAULT} className="py-8" />
              ) : photoList.length === 0 ? (
                <Text variant="body" className="text-ink-muted py-6 text-center">No photos yet. Add one to start {cat.name}’s album.</Text>
              ) : (
                <PhotoGrid photos={photoList} columns={3} onPress={(_, i) => setViewing(i)} />
              )}
            </View>
          )}

          {tab === 'records' && <Records catId={cat.catId} />}

          <ArchiveSection cat={cat} />
        </View>
      </ScrollView>

      <PhotoViewer
        photos={photoList}
        index={viewing}
        onClose={() => setViewing(null)}
        onDelete={(p) => deletePhoto.mutate({ catId: p.catId, photoId: p.photoId }, { onSuccess: () => setViewing(null) })}
      />
    </View>
  );
}

// ------------------------------------------------------------------ Overview tab
function Overview({ cat, photos, photoTotal, onOpenPhotos, onAddPhoto, uploading }: {
  cat: CatResponse;
  photos: CatPhoto[];
  photoTotal: number;
  onOpenPhotos: () => void;
  onAddPhoto: () => void;
  uploading: boolean;
}) {
  const [showChip, setShowChip] = useState(false);
  const { data: analytics } = useDashboardAnalytics();
  const stats = analytics?.analysis.find((a) => a.catId === cat.catId);

  const details: { label: string; value: string; onPress?: () => void; hint?: string }[] = [
    { label: 'Birthday', value: cat.birthDate ? `${formatLongDate(cat.birthDate)}${cat.birthDateEstimated ? ' (est.)' : ''}` : 'Not set' },
    { label: 'Adopted', value: cat.adoptedDate ? formatLongDate(cat.adoptedDate) : 'Not set' },
  ];
  if (cat.microchipId) {
    details.push({
      label: 'Microchip',
      value: showChip ? cat.microchipId.replace(/(\d{3})(?=\d)/g, '$1 ') : maskMicrochip(cat.microchipId),
      onPress: () => setShowChip((v) => !v),
      hint: showChip ? 'Hide microchip ID' : 'Show full microchip ID',
    });
  }

  return (
    <View className="gap-5">
      {/* Averages from the last 30 logs, in the unit the cat was most recently logged in. */}
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Opens detailed analytics"
        onPress={() => router.push({ pathname: '/dashboard/analytics', params: { catId: cat.catId } })}
        className="bg-surface border border-line rounded-card p-4 flex-row gap-2 active:opacity-90"
      >
        <Stat label="Weight" value={formatWeight(cat.weight, cat.weightUnit) ?? '—'} />
        <Stat label="Food / day" value={formatAmount(stats?.averageFood ? Number(stats.averageFood.amount) : null, stats?.averageFood?.unit) ?? '—'} />
        <Stat label="Water / day" value={formatAmount(stats?.averageWater ? Number(stats.averageWater.amount) : null, stats?.averageWater?.unit) ?? '—'} />
      </Pressable>

      <View className="gap-2.5">
        <SectionHeader title="Details" />
        <Card padded={false} className="px-4">
          {details.map((d, i) => (
            <Fragment key={d.label}>
              {i > 0 && <Divider />}
              <Pressable
                disabled={!d.onPress}
                onPress={d.onPress}
                accessibilityHint={d.hint}
                className="flex-row justify-between items-center py-3.5 gap-3"
              >
                <Text variant="body" className="text-ink-muted">{d.label}</Text>
                <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>{d.value}</Text>
              </Pressable>
            </Fragment>
          ))}
        </Card>
      </View>

      <View className="gap-2.5">
        <SectionHeader
          title="Photos"
          right={photoTotal > 0 ? <Text variant="label" className="font-body text-ink-muted">{photoTotal}</Text> : undefined}
        />
        {photos.length > 0 ? (
          <PhotoGrid photos={photos} columns={4} max={4} onPress={onOpenPhotos} />
        ) : (
          <Button
            variant="secondary"
            title="Add the first photo"
            icon={<Feather name="image" size={18} color={Colors.ink.DEFAULT} />}
            onPress={onAddPhoto}
            loading={uploading}
          />
        )}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text variant="caption" className="text-micro font-body">{label}</Text>
      <Text className="font-body-bold text-[18px] leading-6 text-ink">{value}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ Records tab
function Records({ catId }: { catId: string }) {
  const { data: logs = [], isLoading, error } = useLogs(catId);
  if (isLoading) return <ActivityIndicator color={Colors.primary.DEFAULT} className="py-8" />;
  if (error) return <Text variant="body" className="text-danger">Couldn’t load records. Pull down to try again.</Text>;
  if (logs.length === 0) return <Text variant="body" className="text-ink-muted py-6 text-center">No logs yet.</Text>;

  const recent = logs.slice(0, 14);
  return (
    <View className="gap-3">
      <Card padded={false}>
        {recent.map((log, i) => (
          <Fragment key={log.id}>
            {i > 0 && <Divider />}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/logs/${log.id}`)}
              className="flex-row items-center gap-3 px-4 py-3.5 active:bg-fill"
            >
              <Text variant="label" className="w-16 font-body-bold">{formatShortDay(log.date)}</Text>
              <Text variant="label" className="flex-1 font-body text-ink-soft" numberOfLines={2}>{summarizeLog(log)}</Text>
            </Pressable>
          </Fragment>
        ))}
      </Card>
      {logs.length > recent.length && (
        <Pressable onPress={() => router.push('/logs')} accessibilityRole="link" className="self-center py-2">
          <Text variant="label" className="text-primary">See all logs</Text>
        </Pressable>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ Archive / restore / delete
// Kept apart from everyday actions, and worded calmly: archiving is for a cat who has passed away.
function ArchiveSection({ cat }: { cat: CatResponse }) {
  const archive = useArchiveCat();
  const unarchive = useUnarchiveCat();
  const remove = useDeleteCat();

  if (!cat.archivedAt) {
    const confirm = () =>
      Alert.alert(`Archive ${cat.name}?`, `Logs, photos and reports are kept and reminders stop. You can restore ${cat.name} from Archived cats.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', onPress: () => archive.mutate(cat.catId, { onSuccess: () => router.back() }) },
      ]);
    return (
      <View className="mt-3 pt-6 border-t border-line gap-2.5">
        <Button
          variant="secondary"
          title={`Archive ${cat.name}`}
          icon={<Feather name="archive" size={18} color={Colors.ink.DEFAULT} />}
          onPress={confirm}
          loading={archive.isPending}
        />
        <Text variant="caption" className="text-center">
          For a cat who has passed away. Logs, photos and reports are kept, and reminders stop.
        </Text>
      </View>
    );
  }

  const confirmDelete = () =>
    Alert.alert(`Delete ${cat.name} permanently?`, 'This removes the profile, every log and every photo. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate(cat.catId, { onSuccess: () => router.back() }) },
    ]);

  return (
    <View className="mt-3 pt-6 border-t border-line gap-2.5">
      <Button
        variant="secondary"
        title={`Restore ${cat.name}`}
        icon={<Feather name="rotate-ccw" size={18} color={Colors.ink.DEFAULT} />}
        onPress={() => unarchive.mutate(cat.catId)}
        loading={unarchive.isPending}
      />
      <Text variant="caption" className="text-center">Restoring puts {cat.name} back on My cats and turns reminders on again.</Text>
      <Pressable onPress={confirmDelete} disabled={remove.isPending} accessibilityRole="button" className="self-center h-11 justify-center mt-2">
        <Text variant="label" className="text-danger">{remove.isPending ? 'Deleting…' : 'Delete permanently'}</Text>
      </Pressable>
    </View>
  );
}

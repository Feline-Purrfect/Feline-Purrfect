import { CatAvatar } from '@/components/cats/CatAvatar';
import { PhotoGrid } from '@/components/cats/PhotoGrid';
import { PhotoViewer } from '@/components/cats/PhotoViewer';
import { Button, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useCatPhotosOn, useDeleteCatPhoto } from '@/hooks/useCats';
import { formatWeight } from '@/lib/cats';
import { cn } from '@/lib/cn';
import { formatAmount, logTime, medicationLabel, symptomLabel } from '@/lib/logs';
import { CatResponse } from '@/types/cat';
import { LogResponse } from '@/types/log';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

function CardHeader({ cat, subtitle, chevron }: { cat: CatResponse; subtitle: string; chevron?: boolean }) {
  return (
    <View className="flex-row items-center gap-3">
      <CatAvatar cat={cat} className="w-10 h-10 rounded-full" initialSize={16} />
      <View className="flex-1 gap-0.5">
        <Text className="font-body-bold text-input text-ink">{cat.name}</Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      {chevron && <Feather name="chevron-right" size={18} color={Colors.ink.muted} />}
    </View>
  );
}

function Row({ label, children, first, top }: { label: string; children: ReactNode; first?: boolean; top?: boolean }) {
  return (
    <View className={cn('flex-row gap-3 py-2.5', top ? 'items-start' : 'items-center', !first && 'border-t border-line-soft')}>
      <Text variant="caption" className={cn('w-[88px]', top && 'pt-0.5')}>{label}</Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}

export function SymptomTags({ symptoms }: { symptoms: LogResponse['symptoms'] }) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {symptoms.map((s) => (
        <Text key={s.name} className="font-body-bold text-caption text-attention-ink bg-attention-soft px-2.5 py-1 rounded-[10px] overflow-hidden">
          {symptomLabel(s)}
        </Text>
      ))}
    </View>
  );
}

function Stat({ label, value, width = 'w-1/3' }: { label: string; value: string | null; width?: string }) {
  return (
    <View className={cn(width, 'gap-0.5 pr-2 pb-3')}>
      <Text variant="caption" className="text-micro font-body">{label}</Text>
      <Text className="font-body-bold text-input text-ink" style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1}>{value ?? '—'}</Text>
    </View>
  );
}

/**
 * Logs tab: the day at a glance. Food, water and litter, any symptom (the thing you most need to see),
 * and a quiet line saying what else is in the log. Tap for the full detail.
 */
export function CompactLogCard({ cat, log, onPress }: { cat: CatResponse; log: LogResponse; onPress: () => void }) {
  const { data: photos = [] } = useCatPhotosOn(cat.catId, log.date);
  const extras = [
    log.medications.length ? (log.medications.length === 1 ? '1 medication' : `${log.medications.length} medications`) : null,
    log.teethBrushed ? 'Teeth brushed' : null,
    log.weight != null ? formatWeight(log.weight, cat.weightUnit) : null,
    log.temperature != null ? `${log.temperature} °C` : null,
    log.notes ? 'Note' : null,
    photos.length ? (photos.length === 1 ? '1 photo' : `${photos.length} photos`) : null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cat.name}'s log. Open details`}
      onPress={onPress}
      className="bg-surface border border-line rounded-card p-4 gap-3.5 active:opacity-90"
    >
      <CardHeader cat={cat} subtitle={`Logged ${logTime(log.createdAt)}`} chevron />
      <View className="flex-row -mb-3">
        <Stat width="w-1/4" label="Food" value={formatAmount(log.foodAmount, log.foodUnit)} />
        <Stat width="w-1/4" label="Water" value={formatAmount(log.waterAmount, log.waterUnit)} />
        <Stat width="w-1/4" label="Poo" value={String(log.pooCount)} />
        <Stat width="w-1/4" label="Pee" value={String(log.peeCount)} />
      </View>
      {log.symptoms.length > 0 && <SymptomTags symptoms={log.symptoms} />}
      {extras.length > 0 && (
        <Text variant="caption" numberOfLines={1} className="pt-3 border-t border-line-soft">{extras.join(' · ')}</Text>
      )}
    </Pressable>
  );
}

/** Log detail: everything, including photos as their own row. Tapping a photo opens the carousel. */
export function FullLogCard({ cat, log }: { cat: CatResponse; log: LogResponse }) {
  const { data: photos = [] } = useCatPhotosOn(cat.catId, log.date);
  const deletePhoto = useDeleteCatPhoto();
  const [viewing, setViewing] = useState<number | null>(null);

  const rows: { label: string; node: ReactNode; top?: boolean }[] = [];
  if (log.symptoms.length) rows.push({ label: 'Symptoms', top: true, node: <SymptomTags symptoms={log.symptoms} /> });
  if (log.teethBrushed != null) {
    rows.push({
      label: 'Teeth',
      node: (
        <View className="flex-row items-center gap-1.5">
          <Feather name={log.teethBrushed ? 'check' : 'minus'} size={16} color={log.teethBrushed ? Colors.primary.DEFAULT : Colors.ink.muted} />
          <Text variant="bodyStrong">{log.teethBrushed ? 'Brushed' : 'Not brushed'}</Text>
        </View>
      ),
    });
  }
  if (log.medications.length) {
    rows.push({ label: 'Medication', top: true, node: <Text variant="bodyStrong">{log.medications.map(medicationLabel).join('\n')}</Text> });
  }
  if (log.notes) rows.push({ label: 'Notes', top: true, node: <Text variant="label" className="font-body text-ink-soft leading-5">{log.notes}</Text> });
  if (photos.length) {
    rows.push({ label: 'Photos', top: true, node: <PhotoGrid photos={photos} columns={3} onPress={(_, i) => setViewing(i)} /> });
  }

  return (
    <View className="bg-surface border border-line rounded-card p-4 gap-3.5">
      <CardHeader cat={cat} subtitle={`Logged ${logTime(log.createdAt)}`} />
      <View className="flex-row flex-wrap -mb-3">
        <Stat label="Food" value={formatAmount(log.foodAmount, log.foodUnit)} />
        <Stat label="Water" value={formatAmount(log.waterAmount, log.waterUnit)} />
        <Stat label="Weight" value={formatWeight(log.weight, cat.weightUnit)} />
        <Stat label="Poo" value={String(log.pooCount)} />
        <Stat label="Pee" value={String(log.peeCount)} />
        <Stat label="Temp" value={log.temperature != null ? `${log.temperature} °C` : null} />
      </View>
      {rows.length > 0 && (
        <View className="border-t border-line-soft">
          {rows.map((r, i) => <Row key={r.label} label={r.label} first={i === 0} top={r.top}>{r.node}</Row>)}
        </View>
      )}
      <PhotoViewer
        photos={photos}
        index={viewing}
        onClose={() => setViewing(null)}
        onDelete={(p) => deletePhoto.mutate({ catId: p.catId, photoId: p.photoId }, { onSuccess: () => setViewing(null) })}
      />
    </View>
  );
}

/** Not finished yet (or not started): dashed card, any symptom already noted, and one clear action. */
export function PendingLogCard({ cat, log, date, isToday }: { cat: CatResponse; log: LogResponse | null; date: string; isToday: boolean }) {
  const [first, ...rest] = log?.symptoms ?? [];
  const go = () =>
    log ? router.push(`/logs/${log.id}/edit`) : router.push({ pathname: '/logs/[id]/create', params: { id: cat.catId, date } });
  const cta = log ? (isToday ? 'Finish today’s log' : 'Finish this log') : isToday ? 'Log today' : 'Add a log for this day';

  return (
    <View className="bg-surface border border-dashed border-line-strong rounded-card p-4 gap-3.5">
      <CardHeader cat={cat} subtitle={log ? 'Daily log not finished' : 'Not logged yet'} />
      {first && (
        <View className="flex-row items-center gap-2.5 px-3 py-2.5 rounded-field bg-attention-soft">
          <Text className="font-body-bold text-label text-attention-ink">{symptomLabel(first)}</Text>
          {rest.length > 0 && (
            <Text numberOfLines={1} className="flex-1 font-body text-label text-attention-ink">· {rest.map(symptomLabel).join(' · ')}</Text>
          )}
        </View>
      )}
      <Button title={cta} onPress={go} className="h-12 rounded-tile" textClassName="font-body-semibold text-body" />
    </View>
  );
}

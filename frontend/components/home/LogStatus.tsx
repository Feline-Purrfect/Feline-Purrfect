import { CatAvatar } from '@/components/cats/CatAvatar';
import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { CatResponse } from '@/types/cat';
import { LogResponse } from '@/types/log';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

const MAX_PENDING_ROWS = 3;

/** Logs tab on a given day. `at` makes each tap a new request, so it always jumps there. */
function openLogsOn(date: string) {
  router.push({ pathname: '/logs', params: { date, at: String(Date.now()) } });
}

/** "Mochi and Tofu logged", "Mochi, Tofu and 3 more logged". */
function doneSummary(names: string[]) {
  if (names.length <= 2) return `${names.join(' and ')} logged`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more logged`;
}

/**
 * Today's logging progress. Cats still to log get a row with a Log button (up to 3; the rest collapse
 * into "N more to log"); finished cats collapse into a single line. Scales from 1 to many cats.
 */
export function LogStatus({
  cats,
  todayLogs,
  today,
}: {
  cats: CatResponse[];
  todayLogs: LogResponse[];
  today: string;
}) {
  const logFor = (catId: string) =>
    todayLogs.find((l) => l.catId === catId) ?? null;
  const done = cats.filter((c) => logFor(c.catId)?.complete);
  const pending = cats.filter((c) => !logFor(c.catId)?.complete);
  const shown = pending.slice(0, MAX_PENDING_ROWS);
  const extra = pending.length - shown.length;
  const pct = cats.length ? Math.round((done.length / cats.length) * 100) : 0;

  // One finished cat → that log's detail. Several → the Logs tab, on today.
  const openDone = () => {
    const only = done.length === 1 ? logFor(done[0].catId) : null;
    if (only) router.push(`/logs/${only.id}`);
    else openLogsOn(today);
  };

  // Rows in order, so each knows whether it's last (no bottom border).
  const rows: { key: string; node: (last: boolean) => ReactNode }[] = [
    ...shown.map((cat) => ({
      key: cat.catId,
      node: (last: boolean) => {
        const log = logFor(cat.catId);
        const open = () =>
          log
            ? router.push(`/logs/${log.id}/edit`)
            : router.push({
                pathname: '/logs/[id]/create',
                params: { id: cat.catId, date: today },
              });
        return (
          <View
            className={cn(
              'flex-row items-center gap-3 px-4 py-3.5',
              !last && 'border-b border-line-soft',
            )}
          >
            <CatAvatar
              cat={cat}
              className="w-10 h-10 rounded-full"
              initialSize={16}
            />
            <View className="flex-1 gap-0.5">
              <Text
                className="font-body-semibold text-input text-ink"
                numberOfLines={1}
              >
                {cat.name}
              </Text>
              <Text variant="caption">
                {log ? 'Daily log not finished' : 'Not logged yet'}
              </Text>
            </View>
            {/* The Pressable itself carries the pressed style (never an inner View). */}
            <Pressable
              onPress={open}
              accessibilityRole="button"
              accessibilityLabel={`${log ? 'Finish' : 'Log'} ${cat.name}'s day`}
              hitSlop={4}
              className="h-10 px-4 rounded-full bg-primary flex-row items-center gap-1.5 active:bg-primary-pressed"
            >
              <Feather name="edit-2" size={14} color="#FFFFFF" />
              <Text className="font-body-semibold text-label text-white">
                {log ? 'Finish' : 'Log'}
              </Text>
            </Pressable>
          </View>
        );
      },
    })),
    ...(extra > 0
      ? [
          {
            key: 'more',
            node: (last: boolean) => (
              <Pressable
                onPress={() => openLogsOn(today)}
                accessibilityRole="button"
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3.5 active:bg-fill',
                  !last && 'border-b border-line-soft',
                )}
              >
                <Text className="flex-1 font-body-bold text-body text-primary">
                  {extra} more to log
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={Colors.primary.DEFAULT}
                />
              </Pressable>
            ),
          },
        ]
      : []),
    ...(done.length > 0
      ? [
          {
            key: 'done',
            node: (last: boolean) => (
              <Pressable
                onPress={openDone}
                accessibilityRole="button"
                accessibilityHint={
                  done.length === 1
                    ? `Opens ${done[0].name}'s log`
                    : "Opens today's logs"
                }
                className={cn(
                  'flex-row items-center gap-3 px-4 py-3.5 active:bg-fill',
                  !last && 'border-b border-line-soft',
                )}
              >
                <View className="w-7 h-7 rounded-full bg-primary-soft items-center justify-center">
                  <Feather
                    name="check"
                    size={15}
                    color={Colors.primary.DEFAULT}
                  />
                </View>
                <Text
                  className="flex-1 font-body-semibold text-body text-ink"
                  numberOfLines={1}
                >
                  {doneSummary(done.map((c) => c.name))}
                </Text>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={Colors.ink.muted}
                />
              </Pressable>
            ),
          },
        ]
      : []),
  ];

  return (
    <View className="px-5 gap-3">
      <View className="gap-2.5">
        <View className="flex-row items-end justify-between">
          <Text variant="card" accessibilityRole="header">
            Log Status
          </Text>
          <Text
            variant="label"
            className="text-ink-muted"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {pending.length === 0
              ? 'All done'
              : `${done.length} of ${cats.length} done`}
          </Text>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Today's logs"
          accessibilityValue={{ min: 0, max: cats.length, now: done.length }}
          className="h-1.5 rounded-full bg-fill-deep overflow-hidden"
        >
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </View>
      </View>
      <View className="bg-surface border border-line rounded-card overflow-hidden">
        {rows.map((r, i) => (
          <View key={r.key}>{r.node(i === rows.length - 1)}</View>
        ))}
      </View>
    </View>
  );
}

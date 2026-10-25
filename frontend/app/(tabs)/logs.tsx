import { ErrorView } from '@/components/common/ErrorView';
import { Button, Text } from '@/components/ds';
import { CalendarSheet } from '@/components/logs/CalendarSheet';
import { CompactLogCard, PendingLogCard } from '@/components/logs/LogDayCard';
import { LogCardsSkeleton } from '@/components/logs/LogSkeletons';
import { WeekStrip } from '@/components/logs/WeekStrip';
import { Colors } from '@/constants/colors';
import { useCats } from '@/hooks/useCats';
import { useLogsRange } from '@/hooks/useLogs';
import { fromYmd, todayYmd } from '@/lib/dates';
import { addDays, dayStatus } from '@/lib/logs';
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LONG = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long' });

export default function LogsScreen() {
  const insets = useSafeAreaInsets();
  const [today, setToday] = useState(todayYmd);
  const [selected, setSelected] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // /logs?date=YYYY-MM-DD (e.g. from Home) jumps to that day. Handled once per new value, during
  // render rather than in an effect, so the right day shows on the first frame.
  // `at` makes each request unique, so tapping the same link again still jumps back.
  const { date: dateParam, at } = useLocalSearchParams<{ date?: string; at?: string }>();
  const requestKey = dateParam ? `${dateParam}|${at ?? ''}` : undefined;
  const [handledParam, setHandledParam] = useState<string | undefined>(undefined);
  if (requestKey !== handledParam) {
    setHandledParam(requestKey);
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= todayYmd()) setSelected(dateParam);
  }

  // The app can stay open past midnight; re-read "today" whenever the tab is focused.
  useFocusEffect(useCallback(() => {
    const t = todayYmd();
    setToday((prev) => {
      if (prev !== t) setSelected((s) => (s === prev ? t : s));
      return t;
    });
  }, []));

  // The selected day sits in the middle of the strip (3 days either side).
  const days = Array.from({ length: 7 }, (_, i) => addDays(selected, i - 3));

  const cats = useCats();
  const week = useLogsRange(days[0], days[6]);

  if (cats.error && !cats.data) return <ErrorView message={(cats.error as any)?.message} onRetry={() => cats.refetch()} />;

  const catList = cats.data ?? [];
  const catIds = catList.map((c) => c.catId);
  const logs = week.data ?? [];
  const isToday = selected === today;
  const dayLogs = logs.filter((l) => l.date === selected);

  return (
    <View className="flex-1 bg-canvas">
      <View className="px-5 gap-3.5" style={{ paddingTop: insets.top + 14 }}>
        <View className="flex-row items-center justify-between">
          <Text variant="title" accessibilityRole="header">Logs</Text>
          <Pressable
            onPress={() => setCalendarOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Open calendar, ${MONTH.format(fromYmd(selected))}`}
            className="h-11 px-3.5 rounded-full border border-line bg-surface flex-row items-center gap-2 active:bg-fill"
          >
            <Feather name="calendar" size={16} color={Colors.ink.DEFAULT} />
            <Text variant="label">{MONTH.format(fromYmd(selected))}</Text>
          </Pressable>
        </View>
        <WeekStrip days={days} selected={selected} today={today} onSelect={setSelected} statusFor={(d) => dayStatus(logs, d, catIds).status} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 14 }}
        refreshControl={<RefreshControl refreshing={week.isRefetching} onRefresh={() => week.refetch()} tintColor={Colors.primary.DEFAULT} />}
      >
        <Text variant="label" className="text-ink-muted">
          {isToday ? `Today · ${LONG.format(fromYmd(selected))}` : LONG.format(fromYmd(selected))}
        </Text>

        {cats.isLoading ? (
          <LogCardsSkeleton />
        ) : catList.length === 0 ? (
          <View className="bg-surface border border-line rounded-card px-5 py-8 items-center gap-3">
            <Text variant="card" className="text-center">No cats to log yet</Text>
            <Text variant="caption" className="text-center text-body">Add a cat first, then log their food, water and litter here each day.</Text>
            <Button title="Add cat" onPress={() => router.push('/my-cats/create')} className="self-stretch mt-2" />
          </View>
        ) : week.isLoading || week.isPlaceholderData ? (
          // isPlaceholderData: the strip moved and the new days are still loading
          <LogCardsSkeleton cards={catList.length} />
        ) : week.error ? (
          <Text variant="body" className="text-danger">{(week.error as any)?.message ?? 'Couldn’t load logs.'} Pull down to try again.</Text>
        ) : (
          // Finished logs first, then the ones still to do.
          [...catList]
            .sort((a, b) => Number(!dayLogs.find((l) => l.catId === a.catId)?.complete) - Number(!dayLogs.find((l) => l.catId === b.catId)?.complete))
            .map((cat) => {
              const log = dayLogs.find((l) => l.catId === cat.catId) ?? null;
              return log?.complete ? (
                <CompactLogCard key={cat.catId} cat={cat} log={log} onPress={() => router.push(`/logs/${log.id}`)} />
              ) : (
                <PendingLogCard key={cat.catId} cat={cat} log={log} date={selected} isToday={isToday} />
              );
            })
        )}
      </ScrollView>

      <CalendarSheet
        // remount on open so the month starts at the selected day
        key={calendarOpen ? `open-${selected}` : 'closed'}
        visible={calendarOpen}
        selected={selected}
        cats={catList}
        onSelect={setSelected}
        onClose={() => setCalendarOpen(false)}
      />
    </View>
  );
}

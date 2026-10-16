import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Button, Text } from '@/components/ds';
import { CalendarSheet } from '@/components/logs/CalendarSheet';
import { CompleteLogCard, PendingLogCard } from '@/components/logs/LogDayCard';
import { WeekStrip } from '@/components/logs/WeekStrip';
import { Colors } from '@/constants/colors';
import { useCats } from '@/hooks/useCats';
import { useLogsRange } from '@/hooks/useLogs';
import { fromYmd, todayYmd } from '@/lib/dates';
import { addDays, dayStatus, weekEnding } from '@/lib/logs';
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
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

  // The app can stay open past midnight; re-read "today" whenever the tab is focused.
  useFocusEffect(useCallback(() => {
    const t = todayYmd();
    setToday((prev) => {
      if (prev !== t) setSelected((s) => (s === prev ? t : s));
      return t;
    });
  }, []));

  // The strip shows the last 7 days; picking an older day from the calendar shows the week ending there.
  const stripEnd = selected >= addDays(today, -6) ? today : selected;
  const days = weekEnding(stripEnd);

  const cats = useCats();
  const week = useLogsRange(days[0], days[6]);

  if (cats.isLoading) return <LoadingIndicator />;
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
        <WeekStrip days={days} selected={selected} onSelect={setSelected} statusFor={(d) => dayStatus(logs, d, catIds).status} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 14 }}
        refreshControl={<RefreshControl refreshing={week.isRefetching} onRefresh={() => week.refetch()} tintColor={Colors.primary.DEFAULT} />}
      >
        <Text variant="label" className="text-ink-muted">
          {isToday ? `Today · ${LONG.format(fromYmd(selected))}` : LONG.format(fromYmd(selected))}
        </Text>

        {catList.length === 0 ? (
          <View className="bg-surface border border-line rounded-card px-5 py-8 items-center gap-3">
            <Text variant="card" className="text-center">No cats to log yet</Text>
            <Text variant="caption" className="text-center text-body">Add a cat first, then log their food, water and litter here each day.</Text>
            <Button title="Add cat" onPress={() => router.push('/my-cats/create')} className="self-stretch mt-2" />
          </View>
        ) : week.isLoading ? (
          <LoadingIndicator />
        ) : week.error ? (
          <Text variant="body" className="text-danger">{(week.error as any)?.message ?? 'Couldn’t load logs.'} Pull down to try again.</Text>
        ) : (
          // Finished logs first, then the ones still to do.
          [...catList]
            .sort((a, b) => Number(!dayLogs.find((l) => l.catId === a.catId)?.complete) - Number(!dayLogs.find((l) => l.catId === b.catId)?.complete))
            .map((cat) => {
              const log = dayLogs.find((l) => l.catId === cat.catId) ?? null;
              return log?.complete ? (
                <CompleteLogCard key={cat.catId} cat={cat} log={log} onPress={() => router.push(`/logs/${log.id}`)} />
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

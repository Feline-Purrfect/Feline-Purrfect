import { ErrorView } from '@/components/common/ErrorView';
import { Button, Text } from '@/components/ds';
import { FoodTrendCard } from '@/components/home/FoodTrendCard';
import {
  FoodTrendCardSkeleton,
  HomeSkeleton,
  LogStatusSkeleton,
} from '@/components/home/HomeSkeleton';
import { LogStatus } from '@/components/home/LogStatus';
import { Colors } from '@/constants/colors';
import { catKeys, useCats } from '@/hooks/useCats';
import { useDashboardAnalytics } from '@/hooks/useDashboard';
import { logKeys, useLogsRange } from '@/hooks/useLogs';
import { cn } from '@/lib/cn';
import { todayYmd } from '@/lib/dates';
import { foodWeek } from '@/lib/insights';
import { addDays } from '@/lib/logs';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CARD_GAP = 12;
const DOTS_MAX = 5; // more cats than this → "2 / 10" instead of dots

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { width: screenW } = useWindowDimensions();
  const [today, setToday] = useState(todayYmd);
  const [page, setPage] = useState(0);

  const cats = useCats();
  // Two weeks of logs for every cat: today's status + this week vs last week.
  const logs = useLogsRange(addDays(today, -13), today);
  const analytics = useDashboardAnalytics();

  // Pick up a new day after midnight when coming back to Home. Saving a log, cat or photo already
  // invalidates these queries (they refetch on their own), so only data older than its staleTime is
  // refetched here, instead of three requests every time the tab is shown.
  useFocusEffect(
    useCallback(() => {
      setToday(todayYmd());
      for (const queryKey of [
        catKeys.active,
        logKeys.all,
        ['dashboard', 'analytics'],
      ]) {
        queryClient.refetchQueries({ queryKey, type: 'active', stale: true });
      }
    }, [queryClient]),
  );

  const catList = useMemo(() => cats.data ?? [], [cats.data]);
  const logList = useMemo(() => logs.data ?? [], [logs.data]);
  const weeks = useMemo(
    () =>
      new Map(catList.map((c) => [c.catId, foodWeek(logList, c.catId, today)])),
    [catList, logList, today],
  );

  if (cats.error && !cats.data) {
    return (
      <ErrorView
        message={(cats.error as any)?.message ?? 'Couldn’t load your cats.'}
        onRetry={() => cats.refetch()}
      />
    );
  }

  // The one thing worth flagging: the biggest food drop (≥15%) this week, else the first issue the
  // server's analysis found.
  const biggestDrop = catList
    .map((c) => ({ cat: c, pct: weeks.get(c.catId)?.changePct ?? null }))
    .filter(
      (x): x is { cat: (typeof catList)[number]; pct: number } =>
        x.pct != null && x.pct <= -15,
    )
    .sort((a, b) => a.pct - b.pct)[0];
  const serverIssue = analytics.data?.analysis.find(
    (a) =>
      a.healthIssues.length > 0 && catList.some((c) => c.catId === a.catId),
  );
  // The cat the alert is about, so tapping it opens Analytics on that cat.
  const insightCatId = biggestDrop?.cat.catId ?? serverIssue?.catId ?? null;
  const insight = biggestDrop
    ? `${biggestDrop.cat.name} is eating ${Math.abs(biggestDrop.pct)}% less than last week`
    : serverIssue
      ? `${serverIssue.catName}: ${serverIssue.healthIssues[0].charAt(0).toLowerCase()}${serverIssue.healthIssues[0].slice(1)}`
      : null;

  // One card with a peek of the next when there are several cats; full width for a single cat.
  const single = catList.length === 1;
  const cardW = single ? screenW - 40 : screenW - 76;
  const refreshing =
    cats.isRefetching || logs.isRefetching || analytics.isRefetching;
  const refresh = () =>
    Promise.all([cats.refetch(), logs.refetch(), analytics.refetch()]);

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingTop: insets.top + 14,
        paddingBottom: 28,
        gap: 28,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={Colors.primary.DEFAULT}
        />
      }
    >
      <View className="px-5 flex-row items-center justify-between">
        <Text variant="title" accessibilityRole="header">
          Home
        </Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="w-11 h-11 rounded-full border border-line bg-surface items-center justify-center active:bg-fill"
        >
          <Feather name="settings" size={20} color={Colors.ink.DEFAULT} />
        </Pressable>
      </View>

      {cats.isLoading ? (
        <HomeSkeleton screenWidth={screenW} />
      ) : catList.length === 0 ? (
        <View className="mx-5 bg-surface border border-line rounded-card px-5 py-8 items-center gap-3">
          <Text variant="card" className="text-center">
            Welcome to Feline Purrfect
          </Text>
          <Text variant="caption" className="text-center text-body">
            Add your cat to start logging food, water and litter each day and to
            see how they’re doing.
          </Text>
          <Button
            title="Add cat"
            onPress={() => router.push('/my-cats/create')}
            className="self-stretch mt-2"
          />
        </View>
      ) : (
        <>
          {logs.isLoading ? (
            <LogStatusSkeleton rows={catList.length} />
          ) : logs.error && !logs.data ? (
            <Text variant="body" className="px-5 text-danger">
              {(logs.error as any)?.message ?? 'Couldn’t load today’s logs.'}{' '}
              Pull down to try again.
            </Text>
          ) : (
            <LogStatus
              cats={catList}
              todayLogs={logList.filter((l) => l.date === today)}
              today={today}
            />
          )}

          <View className="gap-3">
            <View className="px-5 flex-row items-end justify-between">
              <Text variant="card" accessibilityRole="header">
                Analytics
              </Text>
              <Pressable
                onPress={() => router.push('/dashboard/analytics')}
                accessibilityRole="link"
                hitSlop={8}
                className="py-2"
              >
                <Text variant="label" className="text-primary">
                  See details
                </Text>
              </Pressable>
            </View>

            {insight && (
              <View className="px-5">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/dashboard/analytics',
                      params: insightCatId ? { catId: insightCatId } : {},
                    })
                  }
                  accessibilityRole="button"
                  accessibilityHint="Opens analytics"
                  className="flex-row items-center gap-3 px-3.5 py-3 rounded-cta bg-attention-soft active:opacity-80"
                >
                  <Feather
                    name="alert-circle"
                    size={18}
                    color={Colors.attention.ink}
                  />
                  <Text className="flex-1 font-body-medium text-label text-attention-ink leading-5">
                    {insight}
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={Colors.attention.ink}
                  />
                </Pressable>
              </View>
            )}

            <FlatList
              data={catList}
              keyExtractor={(c) => c.catId}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardW + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              contentContainerStyle={{ paddingHorizontal: 20 }}
              ItemSeparatorComponent={() => (
                <View style={{ width: CARD_GAP }} />
              )}
              onMomentumScrollEnd={(e) =>
                setPage(
                  Math.max(
                    0,
                    Math.min(
                      catList.length - 1,
                      Math.round(
                        e.nativeEvent.contentOffset.x / (cardW + CARD_GAP),
                      ),
                    ),
                  ),
                )
              }
              renderItem={({ item }) =>
                logs.isLoading ? (
                  <FoodTrendCardSkeleton width={cardW} />
                ) : (
                  <FoodTrendCard
                    cat={item}
                    week={
                      weeks.get(item.catId) ?? foodWeek([], item.catId, today)
                    }
                    width={cardW}
                    onPress={() =>
                      router.push({
                        pathname: '/dashboard/analytics',
                        params: { catId: item.catId },
                      })
                    }
                  />
                )
              }
            />

            {catList.length > 1 &&
              (catList.length <= DOTS_MAX ? (
                <View
                  className="flex-row justify-center gap-1.5"
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                >
                  {catList.map((c, i) => (
                    <View
                      key={c.catId}
                      className={cn(
                        'h-1.5 rounded-full',
                        i === page
                          ? 'w-[18px] bg-primary'
                          : 'w-1.5 bg-line-dot',
                      )}
                    />
                  ))}
                </View>
              ) : (
                <Text
                  variant="caption"
                  className="self-center font-body-semibold"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {page + 1} / {catList.length}
                </Text>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

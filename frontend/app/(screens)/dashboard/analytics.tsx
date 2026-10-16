import { TrendChart } from '@/components/analytics/TrendChart';
import { CatAvatar } from '@/components/cats/CatAvatar';
import { ErrorView } from '@/components/common/ErrorView';
import { LoadingIndicator } from '@/components/common/LoadingIndicator';
import { Button, Segmented, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useCats } from '@/hooks/useCats';
import { useDashboardAnalytics } from '@/hooks/useDashboard';
import { useLogs } from '@/hooks/useLogs';
import {
  amountBars,
  averageCount,
  formatDay,
  latestTemperature,
  Range,
  RANGE_LABEL,
  symptomsInRange,
  weightBars,
  weightSeries,
  worthWatching,
} from '@/lib/analytics';
import { formatWeight, fromKg } from '@/lib/cats';
import { cn } from '@/lib/cn';
import { formatRelativeDay, todayYmd } from '@/lib/dates';
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

const RANGES: { value: Range; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

/** Route: /dashboard/analytics?catId=<id>. Opens on that cat (falls back to the first one). */
export default function AnalyticsScreen() {
  const params = useLocalSearchParams<{ catId?: string }>();
  const [today, setToday] = useState(todayYmd);
  const [picked, setPicked] = useState<string | null>(params.catId ?? null);
  const [range, setRange] = useState<Range>('month');

  const cats = useCats();
  const catList = cats.data ?? [];
  const cat = catList.find((c) => c.catId === picked) ?? catList[0];
  const logs = useLogs(cat?.catId);
  const analytics = useDashboardAnalytics();

  useFocusEffect(useCallback(() => setToday(todayYmd()), []));

  const header = <Stack.Screen options={{ title: 'Analytics' }} />;

  if (cats.isLoading)
    return (
      <>
        {header}
        <LoadingIndicator />
      </>
    );
  if (cats.error && !cats.data) {
    return (
      <>
        {header}
        <ErrorView
          message={(cats.error as any)?.message ?? 'Couldn’t load your cats.'}
          onRetry={() => cats.refetch()}
        />
      </>
    );
  }
  if (!cat) {
    return (
      <>
        {header}
        <View className="flex-1 bg-canvas items-center justify-center px-8 gap-4">
          <Text variant="body" className="text-center text-ink-soft">
            Add a cat and log a few days to see analytics here.
          </Text>
          <Button
            title="Add cat"
            onPress={() => router.push('/my-cats/create')}
            className="self-stretch"
          />
        </View>
      </>
    );
  }

  const logList = logs.data ?? [];
  const unit = cat.weightUnit ?? 'kg';

  const weight = weightSeries(logList, range, today);
  const food = amountBars(logList, 'food', range, today);
  const water = amountBars(logList, 'water', range, today);
  const poo = averageCount(logList, 'pooCount', range, today);
  const pee = averageCount(logList, 'peeCount', range, today);
  const temp = latestTemperature(logList, range, today);
  const symptoms = symptomsInRange(logList, range, today);

  // Insight: our own week-over-week check first, else whatever the server's analysis flagged.
  const insight = worthWatching(logList, cat.name, today);
  const serverIssues =
    analytics.data?.analysis.find((a) => a.catId === cat.catId)?.healthIssues ??
    [];

  const currentWeight = weight.points.length
    ? weight.points[weight.points.length - 1].kg
    : cat.weight;
  const deltaText =
    weight.delta != null
      ? `${weight.delta >= 0 ? '+' : '−'}${Math.abs(fromKg(weight.delta, unit)).toFixed(2)} ${unit} ${RANGE_LABEL[range]}`
      : null;
  const amountText = (v: number | null, u: string | null) =>
    v == null
      ? '—'
      : u === 'g' || u === 'ml'
        ? String(Math.round(v))
        : String(Math.round(v * 10) / 10);
  const perDay = (v: number | null) =>
    v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1);

  return (
    <>
      {header}
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerStyle={{
          padding: 20,
          paddingTop: 8,
          paddingBottom: 40,
          gap: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={logs.isRefetching}
            onRefresh={() => Promise.all([logs.refetch(), analytics.refetch()])}
            tintColor={Colors.primary.DEFAULT}
          />
        }
      >
        {/* Cat switcher */}
        {catList.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            accessibilityRole="tablist"
          >
            {catList.map((c) => {
              const on = c.catId === cat.catId;
              return (
                <Pressable
                  key={c.catId}
                  onPress={() => setPicked(c.catId)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  className={cn(
                    'h-11 pl-1.5 pr-4 rounded-full flex-row items-center gap-2',
                    on
                      ? 'bg-primary-soft border-[1.5px] border-primary'
                      : 'bg-surface border border-line active:bg-fill',
                  )}
                >
                  <CatAvatar
                    cat={c}
                    className="w-8 h-8 rounded-full"
                    initialSize={13}
                  />
                  <Text
                    className={cn(
                      'text-body',
                      on
                        ? 'font-body-bold text-primary-pressed'
                        : 'font-body-semibold text-ink',
                    )}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Segmented
          options={RANGES}
          value={range}
          onChange={setRange}
          accessibilityLabel="Range"
          size="sm"
          className="bg-fill-deep"
        />

        {logs.isLoading ? (
          <ActivityIndicator color={Colors.primary.DEFAULT} className="py-16" />
        ) : logs.error && !logs.data ? (
          <Text variant="body" className="text-danger">
            {(logs.error as any)?.message ?? 'Couldn’t load logs.'} Pull down to
            try again.
          </Text>
        ) : logList.length === 0 ? (
          <View className="bg-surface border border-line rounded-card px-5 py-8 items-center gap-3">
            <Text variant="card" className="text-center">
              No logs yet for {cat.name}
            </Text>
            <Text variant="caption" className="text-center text-body">
              Log a few days of food, water and litter and the trends will show
              up here.
            </Text>
            <Button
              title="Add first log"
              onPress={() =>
                router.push({
                  pathname: '/logs/[id]/create',
                  params: { id: cat.catId, date: today },
                })
              }
              className="self-stretch mt-2"
            />
          </View>
        ) : (
          <>
            {(insight || serverIssues.length > 0) && (
              <View className="bg-attention-soft rounded-[18px] p-4 gap-2.5">
                <Text className="font-body-bold text-micro text-attention-text uppercase tracking-[0.7px]">
                  Worth watching
                </Text>
                <Text className="font-body text-body text-attention-deep leading-[22px]">
                  {insight ?? serverIssues.join('. ')}
                </Text>
              </View>
            )}

            {/* Weight */}
            <View className="bg-surface border border-line rounded-card p-[18px] gap-2.5">
              <View className="flex-row items-end justify-between">
                <Text variant="bodyStrong" className="text-ink-muted">
                  Weight
                </Text>
                {deltaText && <Text variant="caption">{deltaText}</Text>}
              </View>
              <View className="flex-row items-baseline gap-1.5">
                <Text
                  className="font-display text-hero text-ink tracking-display"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {currentWeight != null
                    ? fromKg(currentWeight, unit).toFixed(1)
                    : '—'}
                </Text>
                <Text variant="body" className="text-ink-muted">
                  {unit}
                </Text>
              </View>
              {weight.points.length >= 2 ? (
                <TrendChart
                  variant="line"
                  decimals={1}
                  data={weightBars(logList, range, today).map((b) => ({
                    ...b,
                    value: b.value == null ? null : fromKg(b.value, unit),
                  }))}
                  accessibilityLabel={`Weight ${RANGE_LABEL[range]}, now ${formatWeight(currentWeight, unit)}`}
                />
              ) : (
                <Text variant="caption">
                  Log weight on two or more days to see a trend.
                </Text>
              )}
            </View>

            {/* Food & water */}
            {(
              [
                ['Food', food],
                ['Water', water],
              ] as const
            ).map(([title, data]) => (
              <View
                key={title}
                className="bg-surface border border-line rounded-card p-[18px] gap-2.5"
              >
                <View className="flex-row items-end justify-between">
                  <Text variant="bodyStrong" className="text-ink-muted">
                    {title}
                  </Text>
                  <Text variant="caption">
                    {range === 'year' ? 'monthly average' : 'daily average'}
                  </Text>
                </View>
                {data.average != null ? (
                  <>
                    <View className="flex-row items-baseline gap-1.5">
                      <Text
                        className="font-display text-hero text-ink tracking-display"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {amountText(data.average, data.unit)}
                      </Text>
                      <Text variant="body" className="text-ink-muted">
                        {data.unit} / day
                      </Text>
                    </View>
                    <TrendChart
                      variant="bar"
                      decimals={data.unit === 'g' || data.unit === 'ml' ? 0 : 1}
                      data={data.bars}
                      accessibilityLabel={`Daily ${title.toLowerCase()} ${RANGE_LABEL[range]}, about ${amountText(data.average, data.unit)} ${data.unit} a day`}
                    />
                  </>
                ) : (
                  <Text variant="caption">
                    No {title.toLowerCase()} logged {RANGE_LABEL[range]}.
                  </Text>
                )}
              </View>
            ))}

            {/* Litter + temperature */}
            <View className="flex-row gap-2.5">
              {[
                { label: 'Poo', value: perDay(poo), sub: 'per day' },
                { label: 'Pee', value: perDay(pee), sub: 'per day' },
                {
                  label: 'Temp',
                  value: temp ? String(temp.value) : '—',
                  sub: temp ? `°C · ${formatDay(temp.date)}` : 'not logged',
                },
              ].map((t) => (
                <View
                  key={t.label}
                  className="flex-1 bg-surface border border-line rounded-cta p-3.5 gap-1"
                >
                  <Text variant="caption" className="font-body-semibold">
                    {t.label}
                  </Text>
                  <Text
                    className="font-display text-[22px] leading-[26px] text-ink"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {t.value}
                  </Text>
                  <Text
                    variant="caption"
                    className="text-micro font-body"
                    numberOfLines={1}
                  >
                    {t.sub}
                  </Text>
                </View>
              ))}
            </View>

            {/* Symptoms */}
            <View className="bg-surface border border-line rounded-card px-[18px] py-1.5">
              <Text variant="bodyStrong" className="text-ink-muted mt-3 mb-1">
                Symptoms logged
              </Text>
              {symptoms.length === 0 ? (
                <Text
                  variant="body"
                  className="py-3 border-t border-line-soft text-ink-muted"
                >
                  None {RANGE_LABEL[range]}.
                </Text>
              ) : (
                symptoms.map((s) => (
                  <Fragment key={s.key}>
                    <Pressable
                      onPress={() =>
                        router.push(`/logs/${cat.catId}_${s.date}`)
                      }
                      accessibilityRole="button"
                      accessibilityHint="Opens that day's log"
                      className="flex-row items-center gap-3 py-3 border-t border-line-soft active:opacity-70"
                    >
                      <Text variant="bodyStrong" className="flex-1">
                        {s.name}
                      </Text>
                      <Text
                        variant="label"
                        className="font-body text-ink-muted"
                      >
                        {formatRelativeDay(s.date)}
                      </Text>
                    </Pressable>
                  </Fragment>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

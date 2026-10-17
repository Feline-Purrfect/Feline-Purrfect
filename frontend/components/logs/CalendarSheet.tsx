import { Button, Segmented, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useLogsRange } from '@/hooks/useLogs';
import { cn } from '@/lib/cn';
import { fromYmd, todayYmd, toYmd } from '@/lib/dates';
import { dayStatus, monthCells } from '@/lib/logs';
import { CatResponse } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { memo, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const DAY_ARIA = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS_BACK = 60; // how far back you can swipe (5 years)
const ROW_H = 44;

type Month = { y: number; m: number };

interface CalendarSheetProps {
  visible: boolean;
  selected: string;
  cats: CatResponse[];
  onSelect: (date: string) => void;
  onClose: () => void;
}

/**
 * Month view of logging completeness, filterable by cat. Swipe left/right between months (or use the
 * arrows). Always 6 rows tall, so the sheet doesn't jump between 4-, 5- and 6-week months.
 */
export function CalendarSheet({ visible, selected, cats, onSelect, onClose }: CalendarSheetProps) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const pageW = screenW - 40; // sheet has 20px padding each side
  const today = todayYmd();
  const listRef = useRef<FlatList<Month>>(null);

  // Oldest → current month.
  const months = useMemo<Month[]>(() => {
    const now = fromYmd(today);
    return Array.from({ length: MONTHS_BACK + 1 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK + i, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }, [today]);

  const startIndex = useMemo(() => {
    const s = fromYmd(selected);
    const i = months.findIndex((mo) => mo.y === s.getFullYear() && mo.m === s.getMonth());
    return i === -1 ? months.length - 1 : i;
  }, [months, selected]);

  const [page, setPage] = useState(startIndex);
  const [filter, setFilter] = useState<string>('all');
  const catIds = useMemo(() => (filter === 'all' ? cats.map((c) => c.catId) : [filter]), [filter, cats]);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(months.length - 1, i));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setPage(next);
  };
  const pick = (d: string) => { onSelect(d); onClose(); };

  const filters = [{ value: 'all', label: 'All cats' }, ...cats.map((c) => ({ value: c.catId, label: c.name }))];
  const current = months[page];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close calendar" />
      <View accessibilityViewIsModal className="bg-canvas rounded-t-sheet px-5 pt-2.5 gap-[18px]" style={{ paddingBottom: insets.bottom + 20 }}>
        <View className="self-center w-10 h-[5px] rounded-full bg-[#D3CCC0]" />

        <View className="flex-row items-center gap-1">
          <Text className="flex-1 font-display text-[24px] leading-7 text-ink" accessibilityRole="header" accessibilityLiveRegion="polite">
            {MONTH.format(new Date(current.y, current.m, 1))}
          </Text>
          <Pressable
            onPress={() => goTo(page - 1)}
            disabled={page === 0}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            className="w-11 h-11 items-center justify-center"
          >
            <Feather name="chevron-left" size={22} color={page === 0 ? Colors.disabled : Colors.ink.DEFAULT} />
          </Pressable>
          <Pressable
            onPress={() => goTo(page + 1)}
            disabled={page === months.length - 1}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: page === months.length - 1 }}
            className="w-11 h-11 items-center justify-center"
          >
            <Feather name="chevron-right" size={22} color={page === months.length - 1 ? Colors.disabled : Colors.ink.DEFAULT} />
          </Pressable>
        </View>

        {cats.length > 1 && (
          filters.length <= 3 ? (
            <Segmented options={filters} value={filter} onChange={setFilter} accessibilityLabel="Show logs for" size="sm" className="bg-fill-deep" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {filters.map((f) => {
                const on = f.value === filter;
                return (
                  <Pressable
                    key={f.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => setFilter(f.value)}
                    className={cn('h-9 px-3.5 rounded-full justify-center border', on ? 'bg-surface border-line-strong' : 'bg-fill-deep border-transparent')}
                  >
                    <Text className={cn('text-label', on ? 'font-body-bold text-ink' : 'font-body-semibold text-ink-muted')}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )
        )}

        <View className="gap-2">
          <View className="flex-row" importantForAccessibility="no-hide-descendants">
            {WEEKDAYS.map((w, i) => <Text key={i} className="flex-1 text-center font-body-semibold text-micro text-ink-muted">{w}</Text>)}
          </View>
          <FlatList
            ref={listRef}
            data={months}
            keyExtractor={(mo) => `${mo.y}-${mo.m}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageW))}
            style={{ height: ROW_H * 6 }}
            renderItem={({ item }) => (
              <MonthGrid month={item} width={pageW} selected={selected} today={today} catIds={catIds} onPick={pick} />
            )}
          />
        </View>

        <View className="flex-row flex-wrap gap-x-4 gap-y-2">
          <View className="flex-row items-center gap-1.5"><View className="w-3.5 h-3.5 rounded-full bg-primary" /><Text variant="caption" className="text-ink-soft">All logged</Text></View>
          <View className="flex-row items-center gap-1.5"><View className="w-3.5 h-3.5 rounded-full border-2 border-primary" /><Text variant="caption" className="text-ink-soft">Partly logged</Text></View>
          <View className="flex-row items-center gap-1.5"><View className="w-1.5 h-1.5 rounded-full bg-attention" /><Text variant="caption" className="text-ink-soft">Symptom noted</Text></View>
        </View>

        <Button variant="secondary" title="Go to today" onPress={() => pick(today)} className="h-[52px] rounded-cta bg-surface" />
      </View>
    </Modal>
  );
}

/** One month page. Each page loads its own month's logs (only the visible and adjacent pages render). */
const MonthGrid = memo(function MonthGrid({ month, width, selected, today, catIds, onPick }: {
  month: Month;
  width: number;
  selected: string;
  today: string;
  catIds: string[];
  onPick: (d: string) => void;
}) {
  const from = toYmd(new Date(month.y, month.m, 1));
  const to = toYmd(new Date(month.y, month.m + 1, 0));
  const { data: logs = [] } = useLogsRange(from, to);
  const cells = monthCells(month.y, month.m);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < 42; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={{ width }}>
      {rows.map((row, r) => (
        <View key={r} className="flex-row" style={{ height: ROW_H }}>
          {row.map((d, i) => {
            if (!d) return <View key={i} className="flex-1" />;
            const future = d > today;
            const isToday = d === today;
            const { status, symptom } = future ? { status: 'none' as const, symptom: false } : dayStatus(logs, d, catIds);
            const label = status === 'all' ? 'all logs done' : status === 'part' ? 'partly logged' : 'not logged';
            return (
              <Pressable
                key={i}
                disabled={future}
                onPress={() => onPick(d)}
                accessibilityRole="button"
                accessibilityLabel={`${DAY_ARIA.format(fromYmd(d))}${future ? '' : `, ${label}`}${symptom ? ', symptom noted' : ''}`}
                className="flex-1 items-center justify-center gap-0.5"
              >
                <View
                  className={cn(
                    'w-9 h-9 rounded-full items-center justify-center border-2',
                    status === 'all' ? 'bg-primary border-primary' : status === 'part' ? 'border-primary' : 'border-transparent',
                    d === selected && status !== 'all' && 'bg-primary-soft',
                  )}
                >
                  <Text
                    className={cn(
                      'text-body',
                      isToday ? 'font-body-bold' : 'font-body-semibold',
                      future ? 'text-gray-400' : status === 'all' ? 'text-white' : 'text-ink',
                      isToday && status !== 'all' && 'underline',
                    )}
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {fromYmd(d).getDate()}
                  </Text>
                </View>
                <View className={cn('w-[5px] h-[5px] rounded-full', symptom ? 'bg-attention' : 'bg-transparent')} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});

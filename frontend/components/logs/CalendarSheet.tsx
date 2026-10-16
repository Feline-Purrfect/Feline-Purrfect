import { Button, Segmented, Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { useLogsRange } from '@/hooks/useLogs';
import { cn } from '@/lib/cn';
import { fromYmd, todayYmd, toYmd } from '@/lib/dates';
import { dayStatus, monthCells } from '@/lib/logs';
import { CatResponse } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const DAY_ARIA = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' });
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalendarSheetProps {
  visible: boolean;
  selected: string;
  cats: CatResponse[];
  onSelect: (date: string) => void;
  onClose: () => void;
}

/** Month view of logging completeness, filterable by cat. Tapping a day jumps the Logs tab to it. */
export function CalendarSheet({ visible, selected, cats, onSelect, onClose }: CalendarSheetProps) {
  const insets = useSafeAreaInsets();
  const today = todayYmd();
  const [cursor, setCursor] = useState(() => { const d = fromYmd(selected); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [filter, setFilter] = useState<string>('all');

  const from = toYmd(new Date(cursor.y, cursor.m, 1));
  const to = toYmd(new Date(cursor.y, cursor.m + 1, 0));
  const { data: logs = [] } = useLogsRange(from, to);

  const catIds = useMemo(() => (filter === 'all' ? cats.map((c) => c.catId) : [filter]), [filter, cats]);
  const cells = useMemo(() => monthCells(cursor.y, cursor.m), [cursor]);
  const now = fromYmd(today);
  const atCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const shift = (n: number) => setCursor(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pick = (d: string) => { onSelect(d); onClose(); };

  const filters = [{ value: 'all', label: 'All cats' }, ...cats.map((c) => ({ value: c.catId, label: c.name }))];

  // Rows of 7 for the grid
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Close calendar" />
      <View accessibilityViewIsModal className="bg-canvas rounded-t-sheet px-5 pt-2.5 gap-[18px]" style={{ paddingBottom: insets.bottom + 20 }}>
        <View className="self-center w-10 h-[5px] rounded-full bg-[#D3CCC0]" />

        <View className="flex-row items-center gap-1">
          <Text className="flex-1 font-display text-[24px] leading-7 text-ink" accessibilityRole="header">{MONTH.format(new Date(cursor.y, cursor.m, 1))}</Text>
          <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="Previous month" className="w-11 h-11 items-center justify-center">
            <Feather name="chevron-left" size={22} color={Colors.ink.DEFAULT} />
          </Pressable>
          <Pressable
            onPress={() => shift(1)}
            disabled={atCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: atCurrentMonth }}
            className="w-11 h-11 items-center justify-center"
          >
            <Feather name="chevron-right" size={22} color={atCurrentMonth ? Colors.disabled : Colors.ink.DEFAULT} />
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
          {rows.map((row, r) => (
            <View key={r} className="flex-row">
              {Array.from({ length: 7 }, (_, i) => {
                const d = row[i];
                if (!d) return <View key={i} className="flex-1 h-11" />;
                const future = d > today;
                const isToday = d === today;
                const { status, symptom } = future ? { status: 'none' as const, symptom: false } : dayStatus(logs, d, catIds);
                const label = status === 'all' ? 'all logs done' : status === 'part' ? 'partly logged' : 'not logged';
                return (
                  <Pressable
                    key={i}
                    disabled={future}
                    onPress={() => pick(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`${DAY_ARIA.format(fromYmd(d))}${future ? '' : `, ${label}`}${symptom ? ', symptom noted' : ''}`}
                    className="flex-1 h-11 items-center justify-center gap-0.5"
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

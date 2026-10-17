import { Text, TextField } from '@/components/ds';
import { inputBox } from '@/components/ds/Field';
import { Colors } from '@/constants/colors';
import { CAT_BREEDS } from '@/constants/catBreeds';
import { cn } from '@/lib/cn';
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BreedPickerProps {
  value: string | null;
  onChange: (breed: string | null) => void;
}

const NOT_SURE = '__not_sure__';

export function BreedPicker({ value, onChange }: BreedPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const breeds = CAT_BREEDS.filter((b) => b !== 'Unknown' && b.toLowerCase().includes(q));
    return q ? breeds : [NOT_SURE, ...breeds];
  }, [query]);

  const close = () => { setOpen(false); setQuery(''); };
  const pick = (row: string) => { onChange(row === NOT_SURE ? null : row); close(); };
  const shown = value && value !== 'Unknown' ? value : null;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Breed"
        accessibilityValue={{ text: shown ?? 'Not chosen' }}
        onPress={() => setOpen(true)}
        className={cn(inputBox, 'border-line-strong flex-row items-center justify-between pr-3')}
      >
        <Text className={cn('text-input font-body-medium', shown ? 'text-ink' : 'text-ink-faint')}>{shown ?? 'Choose a breed'}</Text>
        <Feather name="chevron-down" size={18} color={Colors.ink.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable className="flex-1 bg-black/30" onPress={close} accessibilityLabel="Close" />
        <View className="bg-surface rounded-t-sheet h-[78%]" style={{ paddingBottom: insets.bottom }}>
          <View className="px-5 pt-4 pb-3 gap-3 border-b border-line-soft">
            <View className="flex-row items-center justify-between">
              <Text variant="heading" accessibilityRole="header">Choose a breed</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Feather name="x" size={22} color={Colors.ink.muted} />
              </Pressable>
            </View>
            <View className="justify-center">
              <TextField
                value={query}
                onChangeText={setQuery}
                placeholder="Search breeds"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                className="pl-10"
              />
              <View className="absolute left-3.5" pointerEvents="none">
                <Feather name="search" size={18} color={Colors.ink.faint} />
              </View>
            </View>
          </View>

          <FlatList
            data={rows}
            keyExtractor={(r) => r}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item === NOT_SURE ? !shown : item === shown;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => pick(item)}
                  className={cn('min-h-12 px-5 py-3 flex-row items-center justify-between border-b border-line-soft', selected && 'bg-primary-soft')}
                >
                  <Text variant={selected ? 'bodyStrong' : 'body'} className={cn('text-input', item === NOT_SURE && !selected && 'text-ink-muted')}>
                    {item === NOT_SURE ? 'Not sure / mixed' : item}
                  </Text>
                  {selected && <Feather name="check" size={18} color={Colors.primary.DEFAULT} />}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="items-center py-12 px-6">
                <Text variant="caption" className="text-center">No breed matches “{query}”. Clear the search to pick “Not sure / mixed”.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
}

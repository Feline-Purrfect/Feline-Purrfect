import { CatAvatar } from '@/components/cats/CatAvatar';
import { PhotoGrid } from '@/components/cats/PhotoGrid';
import { PhotoViewer } from '@/components/cats/PhotoViewer';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  SectionHeader,
  Segmented,
  Text,
  TextField,
} from '@/components/ds';
import { Colors } from '@/constants/colors';
import {
  useAddCatPhoto,
  useCatPhotosOn,
  useDeleteCatPhoto,
} from '@/hooks/useCats';
import { useImagePicker } from '@/hooks/useImagePicker';
import { fromKg, toKg } from '@/lib/cats';
import { cn } from '@/lib/cn';
import { formatRelativeDay, fromYmd, todayYmd } from '@/lib/dates';
import {
  COMMON_SYMPTOMS,
  DOSE_UNITS,
  FOOD_UNITS,
  symptomLabel,
  WATER_UNITS,
} from '@/lib/logs';
import { CatResponse, WeightUnit } from '@/types/cat';
import {
  DoseUnit,
  FoodUnit,
  LogRequest,
  LogResponse,
  Symptom,
  WaterUnit,
} from '@/types/log';
import Feather from '@expo/vector-icons/Feather';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type LogFormValues = Omit<LogRequest, 'catId' | 'date'>;

interface LogFormProps {
  cat: CatResponse;
  date: string; // YYYY-MM-DD
  initial?: LogResponse | null; // editing / finishing an existing log
  lastUnits?: { food?: FoodUnit | null; water?: WaterUnit | null }; // default to what this cat was last logged in
  submitting: boolean;
  onSubmit: (values: LogFormValues) => void;
  onDelete?: () => void;
}

type MedRow = { key: number; name: string; dose: string; unit: DoseUnit };
type Errors = Partial<
  Record<'food' | 'water' | 'weight' | 'temperature' | 'meds', string>
>;

const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];
const toNum = (s: string) => Number(s.replace(',', '.'));
const numeric = (s: string) => s.replace(/[^0-9.,]/g, '');
const DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const SHORT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

/** Large bold number box used for every amount on this screen. */
function AmountInput({
  value,
  onChange,
  invalid,
  label,
  className,
  align,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  label: string;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <TextField
      value={value}
      onChangeText={(t) => onChange(numeric(t))}
      keyboardType="decimal-pad"
      placeholder=""
      invalid={invalid}
      accessibilityLabel={label}
      className={cn(
        'w-24 h-11 px-3 font-body-bold text-[18px]',
        align === 'right' && 'text-right',
        className,
      )}
      style={{ fontVariant: ['tabular-nums'] }}
    />
  );
}

function Stepper({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  last?: boolean;
}) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-2 px-4 py-3',
        !last && 'border-b border-line-soft',
      )}
    >
      <Text variant="bodyStrong" className="flex-1">
        {label}
      </Text>
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        className="w-11 h-11 rounded-full border border-line-strong bg-surface items-center justify-center active:bg-fill"
      >
        <Feather name="minus" size={18} color={Colors.ink.DEFAULT} />
      </Pressable>
      <Text
        accessibilityLiveRegion="polite"
        className="w-9 text-center font-body-bold text-card text-ink"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(99, value + 1))}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        className="w-11 h-11 rounded-full bg-primary items-center justify-center active:bg-primary-pressed"
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export function LogForm({
  cat,
  date,
  initial,
  lastUnits,
  submitting,
  onSubmit,
  onDelete,
}: LogFormProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // Stable keys for medication rows: initial rows use their index, added rows count up from there.
  const nextKey = useRef(initial?.medications?.length ?? 0);

  const [food, setFood] = useState(
    initial?.foodAmount != null ? String(initial.foodAmount) : '',
  );
  const [foodUnit, setFoodUnit] = useState<FoodUnit>(
    initial?.foodUnit ?? lastUnits?.food ?? 'g',
  );
  const [water, setWater] = useState(
    initial?.waterAmount != null ? String(initial.waterAmount) : '',
  );
  const [waterUnit, setWaterUnit] = useState<WaterUnit>(
    initial?.waterUnit ?? lastUnits?.water ?? 'ml',
  );
  const [poo, setPoo] = useState(initial?.pooCount ?? 0);
  const [pee, setPee] = useState(initial?.peeCount ?? 0);
  const [symptoms, setSymptoms] = useState<Symptom[]>(initial?.symptoms ?? []);
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState('');
  const [teeth, setTeeth] = useState(initial?.teethBrushed ?? false);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(
    cat.weightUnit ?? 'kg',
  );
  const [weight, setWeight] = useState(
    initial?.weight != null
      ? fromKg(initial.weight, cat.weightUnit ?? 'kg').toFixed(1)
      : '',
  );
  const [temp, setTemp] = useState(
    initial?.temperature != null ? String(initial.temperature) : '',
  );
  const [meds, setMeds] = useState<MedRow[]>(() =>
    (initial?.medications ?? []).map((m, i) => ({
      key: i,
      name: m.name,
      dose: m.dose != null ? String(m.dose) : '',
      unit: m.unit,
    })),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  // Index of the photo open in the carousel; null = closed.
  const [viewing, setViewing] = useState<number | null>(null);

  const { data: photos = [] } = useCatPhotosOn(cat.catId, date);
  const addPhoto = useAddCatPhoto();
  const deletePhoto = useDeleteCatPhoto();
  const { pickImage } = useImagePicker({ allowsEditing: false, quality: 0.7 });

  const isToday = date === todayYmd();
  const dateLabel = isToday
    ? `Today, ${SHORT.format(fromYmd(date))}`
    : formatRelativeDay(date) === 'Yesterday'
      ? `Yesterday, ${SHORT.format(fromYmd(date))}`
      : DAY.format(fromYmd(date));

  // ---------------------------------------------------------------- symptoms
  const chipNames = [
    ...COMMON_SYMPTOMS,
    ...symptoms
      .map((s) => s.name)
      .filter(
        (n) =>
          !COMMON_SYMPTOMS.some((c) => c.toLowerCase() === n.toLowerCase()),
      ),
  ];
  const findSymptom = (name: string) =>
    symptoms.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const toggleSymptom = (name: string) =>
    setSymptoms((prev) =>
      findSymptom(name)
        ? prev.filter((s) => s.name.toLowerCase() !== name.toLowerCase())
        : [...prev, { name, count: 1 }],
    );
  const addOther = () => {
    const name = other.trim();
    if (name && !findSymptom(name))
      setSymptoms((prev) => [...prev, { name, count: 1 }]);
    setOther('');
    setOtherOpen(false);
  };

  // ---------------------------------------------------------------- weight unit switch converts the typed value
  const changeWeightUnit = (u: WeightUnit) => {
    if (u === weightUnit) return;
    const n = toNum(weight);
    if (weight.trim() && Number.isFinite(n))
      setWeight(fromKg(toKg(n, weightUnit), u).toFixed(1));
    setWeightUnit(u);
  };

  const updateMed = (key: number, patch: Partial<MedRow>) =>
    setMeds((prev) =>
      prev.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    );

  // ---------------------------------------------------------------- submit
  const validate = (): Errors => {
    const e: Errors = {};
    const f = toNum(food);
    const w = toNum(water);
    if (!food.trim()) e.food = 'Enter how much food. Use 0 if none.';
    else if (!Number.isFinite(f) || f < 0 || f > 5000)
      e.food = 'That amount looks off.';
    if (!water.trim()) e.water = 'Enter how much water. Use 0 if none.';
    else if (!Number.isFinite(w) || w < 0 || w > 10000)
      e.water = 'That amount looks off.';
    if (weight.trim()) {
      const kg = toKg(toNum(weight), weightUnit);
      if (!Number.isFinite(kg) || kg <= 0 || kg > 30)
        e.weight = `Enter a weight up to ${weightUnit === 'kg' ? '30 kg' : '66 lb'}.`;
    }
    if (temp.trim()) {
      const t = toNum(temp);
      if (!Number.isFinite(t) || t < 30 || t > 45)
        e.temperature = 'Enter a temperature between 30 and 45 °C.';
    }
    if (meds.some((m) => !m.name.trim() && m.dose.trim()))
      e.meds = 'Add a name for each medication, or remove it.';
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({
      foodAmount: toNum(food),
      foodUnit,
      waterAmount: toNum(water),
      waterUnit,
      pooCount: poo,
      peeCount: pee,
      symptoms,
      teethBrushed: teeth,
      medications: meds
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name.trim(),
          dose: m.dose.trim() ? toNum(m.dose) : null,
          unit: m.unit,
        })),
      weight: weight.trim()
        ? Math.round(toKg(toNum(weight), weightUnit) * 100) / 100
        : null,
      temperature: temp.trim() ? toNum(temp) : null,
      notes: notes.trim() || null,
    });
  };

  const clear = (k: keyof Errors) =>
    errors[k] && setErrors((p) => ({ ...p, [k]: undefined }));
  const uploadPhoto = async () => {
    const uri = await pickImage();
    if (uri) addPhoto.mutate({ catId: cat.catId, uri, takenOn: date });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      className="flex-1 bg-canvas"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: 4,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 36,
          gap: 28,
        }}
      >
        <View className="-mb-2">
          <View className="flex-row items-center gap-3">
            <CatAvatar
              cat={cat}
              className="w-11 h-11 rounded-full"
              initialSize={17}
            />
            <View className="gap-0.5">
              <Text variant="title" accessibilityRole="header">
                {cat.name}
              </Text>
              <Text variant="body" className="text-ink-muted">
                {dateLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Required */}
        <View className="gap-2.5">
          <SectionHeader
            title="Daily essentials"
            right={<Badge label="Required" />}
          />
          <Card padded={false}>
            <View className="px-4 py-3.5 gap-2.5 border-b border-line-soft">
              <Text variant="bodyStrong">Food</Text>
              <View className="flex-row gap-2.5 items-center">
                <AmountInput
                  value={food}
                  onChange={(v) => {
                    setFood(v);
                    clear('food');
                  }}
                  invalid={!!errors.food}
                  label={`Food in ${foodUnit}`}
                />
                <Segmented
                  options={FOOD_UNITS}
                  value={foodUnit}
                  onChange={setFoodUnit}
                  accessibilityLabel="Food unit"
                  size="sm"
                  className="flex-1"
                />
              </View>
              {errors.food && (
                <Text variant="caption" className="text-danger">
                  {errors.food}
                </Text>
              )}
            </View>
            <View className="px-4 py-3.5 gap-2.5 border-b border-line-soft">
              <Text variant="bodyStrong">Water</Text>
              <View className="flex-row gap-2.5 items-center">
                <AmountInput
                  value={water}
                  onChange={(v) => {
                    setWater(v);
                    clear('water');
                  }}
                  invalid={!!errors.water}
                  label={`Water in ${waterUnit}`}
                />
                <Segmented
                  options={WATER_UNITS}
                  value={waterUnit}
                  onChange={setWaterUnit}
                  accessibilityLabel="Water unit"
                  size="sm"
                  className="flex-1"
                />
              </View>
              {errors.water && (
                <Text variant="caption" className="text-danger">
                  {errors.water}
                </Text>
              )}
            </View>
            <Stepper label="Poo" value={poo} onChange={setPoo} />
            <Stepper label="Pee" value={pee} onChange={setPee} last />
          </Card>
        </View>

        {/* Optional divider (as designed) */}
        <View
          className="flex-row items-center gap-3 -mb-3"
          accessibilityRole="header"
        >
          <Text className="font-body-bold text-caption text-ink-muted uppercase tracking-[0.8px]">
            Optional
          </Text>
          <View className="flex-1 h-px bg-[#E2DDD3]" />
        </View>

        {/* Symptoms */}
        <View className="gap-2.5">
          <SectionHeader title="Symptoms" />
          <View className="flex-row flex-wrap gap-2">
            {chipNames.map((name) => {
              const s = findSymptom(name);
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!s }}
                  onPress={() => toggleSymptom(name)}
                  className={cn(
                    'h-10 px-3.5 rounded-full justify-center border',
                    s
                      ? 'bg-attention-soft border-attention-line'
                      : 'bg-surface border-line',
                  )}
                >
                  <Text
                    className={cn(
                      'font-body-semibold text-label',
                      s ? 'text-attention-ink' : 'text-ink',
                    )}
                  >
                    {s ? symptomLabel(s) : name}
                  </Text>
                </Pressable>
              );
            })}
            {!otherOpen && (
              <Pressable
                onPress={() => setOtherOpen(true)}
                accessibilityRole="button"
                className="h-10 px-3.5 rounded-full justify-center border bg-surface border-line"
              >
                <Text className="font-body-semibold text-label text-ink">
                  + Other
                </Text>
              </Pressable>
            )}
          </View>
          {otherOpen && (
            <View className="flex-row gap-2">
              <TextField
                value={other}
                onChangeText={setOther}
                placeholder="e.g. Watery eyes"
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={addOther}
                className="flex-1"
                accessibilityLabel="Other symptom"
              />
              <Button
                variant="secondary"
                title="Add"
                onPress={addOther}
                className="h-12 bg-surface"
              />
            </View>
          )}
          {symptoms.length > 0 && (
            <Text variant="caption">
              Tap a highlighted symptom to remove it.
            </Text>
          )}
        </View>

        {/* Care */}
        <View className="gap-2.5">
          <SectionHeader title="Care" />
          <View className="min-h-14 px-4 bg-surface border border-line rounded-cta justify-center">
            <Checkbox
              checked={teeth}
              onChange={setTeeth}
              label="Brushed teeth"
            />
          </View>
        </View>

        {/* Body */}
        <View className="gap-2.5">
          <SectionHeader title="Body" />
          <Card padded={false}>
            <View className="px-4 py-3.5 gap-2.5">
              <Text variant="bodyStrong">Weight</Text>
              <View className="flex-row gap-2.5 items-center">
                <AmountInput
                  value={weight}
                  onChange={(v) => {
                    setWeight(v);
                    clear('weight');
                  }}
                  invalid={!!errors.weight}
                  label={`Weight in ${weightUnit}`}
                />
                <Segmented
                  options={WEIGHT_UNITS}
                  value={weightUnit}
                  onChange={changeWeightUnit}
                  accessibilityLabel="Weight unit"
                  size="sm"
                  className="flex-1"
                />
              </View>
              {errors.weight && (
                <Text variant="caption" className="text-danger">
                  {errors.weight}
                </Text>
              )}
            </View>
            <Divider />
            <View className="px-4 py-3.5 gap-1.5">
              <View className="flex-row items-center gap-2.5">
                <Text variant="bodyStrong" className="flex-1">
                  Temperature
                </Text>
                <AmountInput
                  value={temp}
                  onChange={(v) => {
                    setTemp(v);
                    clear('temperature');
                  }}
                  invalid={!!errors.temperature}
                  label="Temperature in °C"
                  className="w-20"
                  align="right"
                />
                <Text variant="body" className="w-6 text-ink-muted">
                  °C
                </Text>
              </View>
              {errors.temperature && (
                <Text variant="caption" className="text-danger">
                  {errors.temperature}
                </Text>
              )}
            </View>
          </Card>
        </View>

        {/* Medication */}
        <View className="gap-2.5">
          <SectionHeader title="Medication" />
          {meds.map((m) => (
            <Card key={m.key} className="gap-3 py-3.5">
              <View className="gap-1.5">
                <Text variant="caption" className="font-body-semibold">
                  Name
                </Text>
                <TextField
                  value={m.name}
                  onChangeText={(t) => {
                    updateMed(m.key, { name: t });
                    clear('meds');
                  }}
                  placeholder="e.g. prescribed by your vet"
                  maxLength={80}
                  className="h-11 px-3"
                  accessibilityLabel="Medication name"
                />
              </View>
              <View className="flex-row gap-2.5 items-end">
                <View className="gap-1.5">
                  <Text variant="caption" className="font-body-semibold">
                    Dose
                  </Text>
                  <AmountInput
                    value={m.dose}
                    onChange={(v) => updateMed(m.key, { dose: v })}
                    label={`Dose in ${m.unit}`}
                  />
                </View>
                <Segmented
                  options={DOSE_UNITS}
                  value={m.unit}
                  onChange={(u) => updateMed(m.key, { unit: u })}
                  accessibilityLabel="Dose unit"
                  size="sm"
                  className="flex-1"
                />
              </View>
              <Pressable
                onPress={() => setMeds((p) => p.filter((x) => x.key !== m.key))}
                accessibilityRole="button"
                className="self-start h-9 justify-center"
              >
                <Text variant="label" className="text-danger">
                  Remove
                </Text>
              </Pressable>
            </Card>
          ))}
          {errors.meds && (
            <Text variant="caption" className="text-danger">
              {errors.meds}
            </Text>
          )}
          <Button
            variant="secondary"
            title="Add medication"
            icon={<Feather name="plus" size={18} color={Colors.ink.DEFAULT} />}
            onPress={() =>
              setMeds((p) => [
                ...p,
                { key: nextKey.current++, name: '', dose: '', unit: 'mg' },
              ])
            }
          />
        </View>

        {/* Photos — uploaded straight away into the cat's album, dated this day.
            One grid for the photos and the Add tile, so the Add tile is the same size with or without photos. */}
        <View className="gap-2.5">
          <SectionHeader title="Photos" />
          <PhotoGrid
            photos={photos}
            columns={4}
            gap={8}
            onPress={(_, i) => setViewing(i)}
            onAdd={uploadPhoto}
            adding={addPhoto.isPending}
          />
        </View>

        {/* Notes */}
        <View className="gap-2.5">
          <Text variant="heading" nativeID="notes-label">
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else worth remembering?"
            placeholderTextColor={Colors.ink.faint}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            accessibilityLabelledBy="notes-label"
            className="min-h-[96px] border border-line rounded-cta bg-surface p-3.5 font-body text-body text-ink leading-[22px]"
          />
        </View>

        <Button title="Save log" onPress={submit} loading={submitting} />
        {onDelete && (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            className="self-center h-11 justify-center -mt-3"
          >
            <Text variant="label" className="text-danger">
              Delete log
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <PhotoViewer
        photos={photos}
        index={viewing}
        onClose={() => setViewing(null)}
        onDelete={(p) =>
          deletePhoto.mutate(
            { catId: p.catId, photoId: p.photoId },
            { onSuccess: () => setViewing(null) },
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

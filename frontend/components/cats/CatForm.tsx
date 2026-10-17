import {
  Badge,
  Button,
  Card,
  Checkbox,
  DateField,
  Field,
  SectionHeader,
  Segmented,
  Text,
  TextField,
} from '@/components/ds';
import { BreedPicker } from '@/components/ui/BreedPicker';
import { Colors } from '@/constants/colors';
import { useImagePicker } from '@/hooks/useImagePicker';
import { formatMicrochip, fromKg, longAge, toKg } from '@/lib/cats';
import { fromYmd, todayYmd } from '@/lib/dates';
import { CatRequest, CatResponse, CatSex, WeightUnit } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type CatFormValues = CatRequest;

interface CatFormProps {
  mode: 'add' | 'edit';
  initial?: CatResponse;
  submitting: boolean;
  onSubmit: (values: CatFormValues) => void;
}

type Errors = Partial<
  Record<
    'name' | 'sex' | 'birthDate' | 'adoptedDate' | 'weight' | 'microchipId',
    string
  >
>;

const SEXES: { value: CatSex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];
const UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

const trimNumber = (n: number) => String(Math.round(n * 10) / 10);
const parseWeight = (s: string) => Number(s.replace(',', '.'));

/** Add a cat / Edit a cat. Same layout for both; `mode` only changes copy and the starting values. */
export function CatForm({ mode, initial, submitting, onSubmit }: CatFormProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const edit = mode === 'edit';

  const [name, setName] = useState(initial?.name ?? '');
  const [sex, setSex] = useState<CatSex | null>(initial?.sex ?? null);
  const [birthDate, setBirthDate] = useState<string | null>(
    initial?.birthDate ?? null,
  );
  const [estimated, setEstimated] = useState(
    initial?.birthDateEstimated ?? false,
  );
  const [adoptedDate, setAdoptedDate] = useState<string | null>(
    initial?.adoptedDate ?? null,
  );
  const [breed, setBreed] = useState<string | null>(initial?.breed ?? null);
  const [unit, setUnit] = useState<WeightUnit>(initial?.weightUnit ?? 'kg');
  const [weight, setWeight] = useState(
    initial?.weight != null
      ? fromKg(initial.weight, initial.weightUnit).toFixed(1)
      : '',
  );
  const [chip, setChip] = useState(
    initial?.microchipId ? formatMicrochip(initial.microchipId) : '',
  );
  const [errors, setErrors] = useState<Errors>({});

  const { imageUri, pickImage, isPickingImage } = useImagePicker();
  const photo = imageUri ?? initial?.photoUrl ?? null;

  // Switching the unit converts the number already typed, so 5.0 kg becomes 11.0 lb rather than 5.0 lb.
  const changeUnit = (next: WeightUnit) => {
    if (next === unit) return;
    const n = parseWeight(weight);
    if (weight.trim() && Number.isFinite(n))
      setWeight(trimNumber(fromKg(toKg(n, unit), next)));
    setUnit(next);
  };

  const ageHint = birthDate
    ? `${name.trim() || 'Your cat'} is ${longAge(birthDate).toLowerCase()} old. Age updates automatically from the birthday.`
    : 'Age updates automatically from the birthday.';

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Enter a name.';
    if (!sex) e.sex = 'Choose female or male.';
    if (!birthDate) e.birthDate = 'Add a birthday. An estimate is fine.';
    if (!adoptedDate) e.adoptedDate = 'Add the adoption date.';
    if (birthDate && adoptedDate && adoptedDate < birthDate)
      e.adoptedDate = 'Can’t be before the birthday.';
    if (weight.trim()) {
      const kg = toKg(parseWeight(weight), unit);
      if (!Number.isFinite(kg) || kg <= 0 || kg > 30)
        e.weight = `Enter a weight between 0 and ${unit === 'kg' ? '30 kg' : '66 lb'}.`;
    }
    const digits = chip.replace(/\D/g, '');
    if (digits && (digits.length < 9 || digits.length > 15))
      e.microchipId = 'Microchip IDs are 9 to 15 digits.';
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const digits = chip.replace(/\D/g, '');
    onSubmit({
      name: name.trim(),
      sex: sex!,
      birthDate: birthDate!,
      birthDateEstimated: estimated,
      adoptedDate: adoptedDate!,
      weight: weight.trim()
        ? Math.round(toKg(parseWeight(weight), unit) * 100) / 100
        : null,
      weightUnit: unit,
      breed,
      microchipId: digits || null,
      photo: imageUri ?? undefined, // only a newly picked photo is uploaded
    });
  };

  const clear = (k: keyof Errors) =>
    errors[k] && setErrors((prev) => ({ ...prev, [k]: undefined }));
  const today = fromYmd(todayYmd());

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
          paddingBottom: insets.bottom + 36,
          paddingHorizontal: 20,
          gap: 28,
        }}
      >
        {/* Photo */}
        <View className="items-center gap-2.5">
          {photo ? (
            <Image
              source={{ uri: photo }}
              className="w-28 h-28 rounded-full bg-fill"
              contentFit="cover"
              accessibilityLabel="Cat photo"
            />
          ) : (
            <View className="w-28 h-28 rounded-full bg-fill-deep items-center justify-center">
              <Feather name="camera" size={28} color={Colors.ink.faint} />
            </View>
          )}
          <Button
            variant="pillOutline"
            title={photo ? 'Change photo' : 'Add photo'}
            icon={<Feather name="image" size={16} color={Colors.ink.DEFAULT} />}
            onPress={pickImage}
            loading={isPickingImage}
          />
        </View>

        {/* Required */}
        <View className="gap-2.5">
          <SectionHeader title="Basics" right={<Badge label="Required" />} />
          <Card className="gap-[18px]">
            <Field label="Name" error={errors.name}>
              <TextField
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  clear('name');
                }}
                placeholder="e.g. Mochi"
                autoCapitalize="words"
                returnKeyType="done"
                maxLength={100}
                invalid={!!errors.name}
                accessibilityLabel="Name"
              />
            </Field>

            <Field label="Sex" error={errors.sex}>
              <Segmented
                options={SEXES}
                value={sex}
                onChange={(v) => {
                  setSex(v);
                  clear('sex');
                }}
                accessibilityLabel="Sex"
              />
            </Field>

            <View className="gap-2">
              <View className="flex-row gap-2.5">
                <Field
                  label="Born"
                  error={errors.birthDate}
                  className="flex-1 min-w-0"
                >
                  <DateField
                    value={birthDate}
                    onChange={(v) => {
                      setBirthDate(v);
                      clear('birthDate');
                    }}
                    maximumDate={today}
                    invalid={!!errors.birthDate}
                    accessibilityLabel="Birthday"
                  />
                </Field>
                <Field
                  label="Adopted"
                  error={errors.adoptedDate}
                  className="flex-1 min-w-0"
                >
                  <DateField
                    value={adoptedDate}
                    onChange={(v) => {
                      setAdoptedDate(v);
                      clear('adoptedDate');
                    }}
                    minimumDate={birthDate ? fromYmd(birthDate) : undefined}
                    maximumDate={today}
                    invalid={!!errors.adoptedDate}
                    accessibilityLabel="Adoption date"
                  />
                </Field>
              </View>
              <Text variant="caption">{ageHint}</Text>
              <Checkbox
                checked={estimated}
                onChange={setEstimated}
                label="Birthday is an estimate"
              />
            </View>
          </Card>
        </View>

        {/* Optional */}
        <View className="gap-2.5">
          <SectionHeader
            title="More details"
            right={<Badge label="Optional" tone="quiet" />}
          />
          <Card className="gap-[18px]">
            <Field label="Breed">
              <BreedPicker value={breed} onChange={setBreed} />
            </Field>

            <Field label="Weight" error={errors.weight}>
              <View className="flex-row gap-2.5 items-center">
                <TextField
                  value={weight}
                  onChangeText={(t) => {
                    setWeight(t.replace(/[^0-9.,]/g, ''));
                    clear('weight');
                  }}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                  invalid={!!errors.weight}
                  className="w-[110px] font-body-semibold"
                  accessibilityLabel={`Weight in ${unit === 'kg' ? 'kilograms' : 'pounds'}`}
                />
                <Segmented
                  options={UNITS}
                  value={unit}
                  onChange={changeUnit}
                  accessibilityLabel="Weight unit"
                  className="flex-1"
                />
              </View>
            </Field>

            <Field label="Microchip ID" error={errors.microchipId}>
              <TextField
                value={chip}
                onChangeText={(t) => {
                  setChip(formatMicrochip(t));
                  clear('microchipId');
                }}
                placeholder="15 digits"
                keyboardType="number-pad"
                maxLength={19} // 15 digits + 4 spaces
                invalid={!!errors.microchipId}
                style={{ fontVariant: ['tabular-nums'] }}
                accessibilityLabel="Microchip ID"
              />
            </Field>
          </Card>
        </View>

        <Button
          title={edit ? 'Save changes' : 'Add cat'}
          onPress={submit}
          loading={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

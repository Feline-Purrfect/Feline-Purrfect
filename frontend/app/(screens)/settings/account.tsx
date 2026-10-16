import { Button, Field, Text, TextField } from '@/components/ds';
import { UserAvatar } from '@/components/settings/UserAvatar';
import { Colors } from '@/constants/colors';
import { useAuth, useDeleteAccount, useUpdateProfile } from '@/hooks/useAuth';
import { useCats } from '@/hooks/useCats';
import Feather from '@expo/vector-icons/Feather';
import { router, useNavigation } from 'expo-router';
import {
  useHeaderHeight,
  usePreventRemove,
} from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** "Mochi", "Mochi and Tofu", "Mochi, Tofu and Miso" — or a count once the list gets long. */
function catProfilesLine(names: string[]) {
  if (names.length === 0) return null;
  if (names.length > 3) return `All ${names.length} cats’ profiles`;
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list}’s ${names.length === 1 ? 'profile' : 'profiles'}`;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: cats = [] } = useCats();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();

  const savedName = user?.name ?? '';
  const [name, setName] = useState(savedName);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const dirty = trimmed !== '' && trimmed !== savedName.trim();
  const nameError =
    name.length > 0 && trimmed === '' ? 'Name can’t be empty.' : null;

  usePreventRemove(dirty && !saved, ({ data }) => {
    Alert.alert(
      'Discard changes?',
      'Your new name hasn’t been saved and will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });

  // Leave only after `saved` has switched the prevention off.
  useEffect(() => {
    if (saved) router.back();
  }, [saved]);

  const save = () => {
    if (!dirty) return;
    updateProfile.mutate(trimmed, { onSuccess: () => setSaved(true) });
  };

  const catsLine = catProfilesLine(cats.map((c) => c.name));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      className="flex-1 bg-canvas"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 4,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          gap: 28,
        }}
      >
        <UserAvatar
          name={trimmed || savedName}
          className="w-20 h-20"
          initialSize={32}
        />

        {/* Profile fields, saved together */}
        <View className="gap-4">
          <Field label="Name" error={nameError}>
            <TextField
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              maxLength={100}
              returnKeyType="done"
              onSubmitEditing={save}
              invalid={!!nameError}
              editable={!updateProfile.isPending}
              accessibilityLabel="Name"
            />
          </Field>

          <Field label="Email" hint="Your sign-in email can’t be changed.">
            <View
              accessible
              accessibilityLabel={`Email, ${user?.email ?? ''}, verified`}
              className="h-12 flex-row items-center bg-fill border border-line rounded-field pl-3.5 pr-2.5 gap-2"
            >
              <Text
                numberOfLines={1}
                className="flex-1 font-body-medium text-input text-gray-700"
              >
                {user?.email}
              </Text>
              <View className="flex-row items-center gap-1 bg-primary-soft px-2 py-[3px] rounded-chip">
                <Feather
                  name="check"
                  size={12}
                  color={Colors.primary.pressed}
                />
                <Text className="font-body-bold text-micro text-primary-pressed">
                  Verified
                </Text>
              </View>
            </View>
          </Field>

          <Button
            title="Save changes"
            onPress={save}
            disabled={!dirty}
            loading={updateProfile.isPending}
            className="h-[52px]"
          />
        </View>

        {/* Danger zone: separated, at the bottom */}
        <View className="mt-auto pt-6 border-t border-line gap-2">
          <Button
            title="Delete account"
            variant="secondary"
            onPress={() => setDeleteOpen(true)}
            className="rounded-tile border-danger/30"
            textClassName="text-danger"
          />
          <Text variant="caption" className="text-center leading-[19px]">
            Permanently removes your account, cats, logs and photos.
          </Text>
        </View>
      </ScrollView>

      {/* Delete confirmation sheet */}
      <Modal
        visible={deleteOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !deleteAccount.isPending && setDeleteOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => !deleteAccount.isPending && setDeleteOpen(false)}
          accessibilityLabel="Cancel"
        />
        <View
          accessibilityViewIsModal
          className="bg-canvas rounded-t-sheet px-5 pt-2.5 gap-4"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="self-center w-10 h-[5px] rounded-full bg-[#D3CCC0]" />
          <Text
            accessibilityRole="header"
            className="font-display text-[24px] leading-7 text-ink"
          >
            Delete your account?
          </Text>
          <Text variant="body" className="text-ink-soft leading-[22px]">
            This can’t be undone. Everything below is deleted right away:
          </Text>
          <View className="bg-surface border border-line rounded-cta px-4 py-3.5 gap-1.5">
            {[
              catsLine,
              'All daily logs, photos and notes',
              'Your account and sign-in',
            ]
              .filter(Boolean)
              .map((line) => (
                <View key={line} className="flex-row gap-2.5">
                  <Text variant="body">•</Text>
                  <Text variant="body" className="flex-1">
                    {line}
                  </Text>
                </View>
              ))}
          </View>
          <View className="gap-2 mt-1">
            <Button
              title="Delete permanently"
              onPress={() => deleteAccount.mutate()}
              loading={deleteAccount.isPending}
              className="h-[52px] bg-danger active:bg-danger"
            />
            <Button
              title="Keep my account"
              variant="secondary"
              onPress={() => setDeleteOpen(false)}
              disabled={deleteAccount.isPending}
              className="h-[52px] rounded-cta bg-surface"
              textClassName="text-input"
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

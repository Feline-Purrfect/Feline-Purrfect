import { Text } from '@/components/ds';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Shared frame for the sign-in screens: title, subtitle and form centered on the screen,
 * with an optional footer pinned to the bottom ("Already have an account? Log in").
 * The native header (when shown) only carries the back button.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

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
          paddingTop: headerHeight ? 16 : insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View className="flex-1 justify-center w-full max-w-[440px] self-center gap-7 py-6">
          <View className="gap-1.5 items-center">
            <Text
              variant="title"
              accessibilityRole="header"
              className="text-center"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className="font-body text-body leading-[22px] text-ink-muted text-center">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </View>

        {footer ? (
          <View className="w-full max-w-[440px] self-center pt-4">
            {footer}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** "Already have an account? Log in" — one line, the action in bold blue. */
export function FooterPrompt({
  prompt,
  action,
  onPress,
}: {
  prompt: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Text className="font-body text-body text-ink-soft text-center">
      {prompt}{' '}
      <Text
        onPress={onPress}
        accessibilityRole="link"
        suppressHighlighting
        className="font-body-bold text-primary"
      >
        {action}
      </Text>
    </Text>
  );
}

/** Banner above a form: `danger` for a failed attempt, `success` for "Email verified". */
export function AuthBanner({
  tone,
  children,
  icon,
}: {
  tone: 'danger' | 'success';
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={
        tone === 'danger'
          ? 'flex-row items-start gap-2.5 px-3.5 py-3 rounded-tile bg-danger-soft'
          : 'flex-row items-start gap-2.5 px-3.5 py-3 rounded-tile bg-primary-soft'
      }
    >
      {icon}
      <Text
        className={
          tone === 'danger'
            ? 'flex-1 font-body text-label leading-5 text-danger-ink'
            : 'flex-1 font-body text-label leading-5 text-primary-pressed'
        }
      >
        {children}
      </Text>
    </View>
  );
}

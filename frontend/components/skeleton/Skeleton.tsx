import { cn } from '@/lib/cn';
import { ReactNode, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Loading placeholder that mirrors the layout of what's coming.
 *
 * One pulse animation per skeleton (not per bone), so every bone fades in sync and a whole screen
 * costs a single animated node. Static when the user has Reduce Motion on.
 *
 * Put real, already-known UI (screen titles, tab labels) around the skeleton, and bones only where
 * data will land, so nothing jumps when the content arrives.
 */
export function Skeleton({
  label = 'Loading',
  announce = true,
  className,
  style,
  children,
}: {
  /** Read by VoiceOver / TalkBack instead of the bones. */
  label?: string;
  /** false for the 2nd, 3rd… card of a repeated list, so a screen reader hears "Loading" once. */
  announce?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      className={className}
      style={style}
      {...(announce
        ? {
            accessible: true,
            accessibilityRole: 'progressbar' as const,
            accessibilityLabel: label,
            accessibilityState: { busy: true },
          }
        : {
            importantForAccessibility: 'no-hide-descendants' as const,
            accessibilityElementsHidden: true,
          })}
    >
      <Animated.View
        style={pulse}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {children}
      </Animated.View>
    </View>
  );
}

/** One placeholder block. Size and shape come from classes, e.g. "h-4 w-24" or "w-10 h-10 rounded-full". */
export function Bone({
  className,
  style,
}: {
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View className={cn('bg-fill-deep rounded-md', className)} style={style} />
  );
}

// Line heights of the type scale (tailwind.config.js fontSize), so a TextBone takes exactly the
// space the real text will and nothing moves when it arrives.
const LINE_HEIGHT = {
  hero: 38,
  title: 32,
  card: 24,
  heading: 22,
  input: 20,
  body: 21,
  label: 19,
  caption: 18,
  micro: 16,
} as const;

/** Placeholder for one line of text in a given type style. Width comes from `className` ("w-32", "w-1/2"). */
export function TextBone({
  variant = 'body',
  className,
}: {
  variant?: keyof typeof LINE_HEIGHT;
  className?: string;
}) {
  const lineHeight = LINE_HEIGHT[variant];
  return (
    <View
      style={{ height: lineHeight }}
      className={cn('justify-center', className)}
    >
      <Bone
        style={{ height: Math.round(lineHeight * 0.62) }}
        className="w-full rounded-full"
      />
    </View>
  );
}

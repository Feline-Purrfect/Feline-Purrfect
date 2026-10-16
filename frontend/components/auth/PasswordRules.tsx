import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import { cn } from '@/lib/cn';
import { PasswordRule } from '@/lib/password';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

/** White card of password rules; each fills in blue as it's met. */
export function PasswordRules({ rules }: { rules: PasswordRule[] }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="bg-surface border border-line rounded-cta px-4 py-3.5 gap-2.5"
    >
      {rules.map((r) => (
        <View
          key={r.label}
          accessible
          accessibilityLabel={`${r.label}, ${r.ok ? 'done' : 'not yet'}`}
          className="flex-row items-center gap-2.5"
        >
          <View
            className={cn(
              'w-5 h-5 rounded-full items-center justify-center',
              r.ok ? 'bg-primary' : 'border-[1.5px] border-[#C4BEB3]',
            )}
          >
            {r.ok && <Feather name="check" size={12} color={Colors.surface} />}
          </View>
          <Text
            className={cn(
              'font-body text-label',
              r.ok ? 'text-ink' : 'text-ink-muted',
            )}
          >
            {r.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

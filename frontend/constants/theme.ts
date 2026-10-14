// Typography. Two families, clearly distinct:
//  - Bricolage Grotesque: screen titles, cat names (display)
//  - Figtree: everything else (body)
// Each weight is a separate family on React Native; tailwind.config.js maps them to
// font-display, font-display-medium, font-body, font-body-medium, font-body-semibold, font-body-bold.
import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';

/** Pass to useFonts() in the root layout. */
export const fontAssets = {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
};

/** Family names for places that take a style object (navigation headers, tab labels). */
export const Fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayMedium: 'BricolageGrotesque_500Medium',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
} as const;

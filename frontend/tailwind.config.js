/** @type {import('tailwindcss').Config} */

// Feline Purrfect design tokens — one source for Nativewind classes.
// JS-side mirror (icons, tab bar, placeholders, native props): constants/colors.ts. Keep both in sync.

const primary = {
  50: '#F2F5FB',
  100: '#E4EBF7', // soft: "Required" / "New" badges, selected rows
  200: '#C9D6EF', // muted: inactive chart bars
  300: '#A3B8E2',
  400: '#6F8DCB',
  500: '#3A5BA6', // brand blue: CTAs, links, active tab, "logged" status
  600: '#2F4A88', // pressed / text on primary-100
  700: '#263C6E',
  800: '#1E2F56',
  900: '#172440',
  DEFAULT: '#3A5BA6',
  soft: '#E4EBF7',
  pressed: '#2F4A88',
};

// Warm neutrals. Overrides Tailwind's cool gray scale so screens not yet redesigned
// (bg-gray-50, text-gray-500, border-gray-200 …) already sit on the new canvas.
const gray = {
  50: '#F6F4F0',
  100: '#F1EEE8',
  200: '#E8E3DA',
  300: '#DCD6CB',
  400: '#B5AFA4',
  500: '#77726A',
  600: '#6B675F',
  700: '#4A453D',
  800: '#3B3833',
  900: '#1D1C1A',
  // legacy aliases used by older screens
  light: '#B5AFA4',
  DEFAULT: '#77726A',
  dark: '#4A453D',
};

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary,
        gray,

        // Surfaces
        canvas: '#F6F4F0',  // app background
        surface: '#FFFFFF', // cards, inputs, tab bar
        fill: {
          DEFAULT: '#F1EEE8', // segmented-control track
          deep: '#ECE8E1',    // "missed" calendar cells, overflow tiles
        },

        // Text
        ink: {
          DEFAULT: '#1D1C1A', // primary text
          soft: '#3B3833',    // long-form body text
          muted: '#6B675F',   // secondary text, captions
          faint: '#77726A',   // placeholders, inactive tab labels
        },

        // Lines
        line: {
          DEFAULT: '#E8E3DA', // card borders, tab bar top border
          strong: '#DCD6CB',  // input & secondary-button borders
          soft: '#F0ECE5',    // dividers inside a card
          dot: '#C9C2B6',     // "partly logged" dot on the week strip
        },

        // Attention: a symptom or change worth a look. Not an error.
        attention: {
          DEFAULT: '#B4561F', // status dot
          text: '#9A4A12',    // status label, highlighted stat
          strong: '#A8551C',  // filled calendar cell
          soft: '#FBEEE3',    // callout / selected-chip background
          line: '#E9C7AA',    // selected-chip border
          ink: '#7A3A0E',     // text on attention-soft
          deep: '#5E2C0A',    // callout body text
        },

        danger: {
          DEFAULT: '#A33A2A', // destructive text actions, invalid field borders
          soft: '#F8E6E2',    // error banner background
          ink: '#7E2A1D',     // text on danger-soft
        },

        // Initial avatars for cats without a photo (paired background / ink)
        avatar: {
          stone: '#DCD5C9',
          'stone-ink': '#4A453D',
          slate: '#CFD6E2',
          'slate-ink': '#3B4456',
        },

        black: { DEFAULT: '#1D1C1A' }, // legacy alias
      },

      // React Native can't synthesize weights for custom fonts, so each weight is its own family.
      // Families are loaded in app/_layout.tsx (see constants/theme.ts).
      fontFamily: {
        display: ['BricolageGrotesque_700Bold'],
        'display-medium': ['BricolageGrotesque_500Medium'],
        body: ['Figtree_400Regular'],
        'body-medium': ['Figtree_500Medium'],
        'body-semibold': ['Figtree_600SemiBold'],
        'body-bold': ['Figtree_700Bold'],
      },

      fontSize: {
        // [size, lineHeight]
        hero: ['34px', '38px'],   // cat name on the profile
        title: ['28px', '32px'],  // screen titles
        card: ['20px', '24px'],   // cat name on a card
        heading: ['17px', '22px'],// section headings
        input: ['16px', '20px'],  // inputs, primary buttons
        body: ['15px', '21px'],
        label: ['14px', '19px'],
        caption: ['13px', '18px'],
        micro: ['12px', '16px'],
        tab: ['11px', '14px'],
      },

      borderRadius: {
        chip: '8px',     // badges
        seg: '9px',      // segmented-control thumb
        field: '12px',   // inputs, segmented track
        tile: '14px',    // photo tiles, outline buttons
        cta: '16px',     // primary buttons, list rows
        card: '20px',    // cards
        sheet: '24px',   // profile sheet, bottom sheets
      },

      spacing: {
        screen: '20px', // horizontal page padding
      },

      letterSpacing: {
        display: '-0.5px', // ≈ -0.02em at 28px
      },
    },
  },
  plugins: [],
};

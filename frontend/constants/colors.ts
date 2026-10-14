// JS mirror of the tokens in tailwind.config.js, for places that need a raw value
// (icon colors, tab bar, ActivityIndicator, placeholderTextColor, native pickers).

export const Colors = {
  primary: {
    50: '#F2F5FB',
    100: '#E4EBF7',
    200: '#C9D6EF',
    300: '#A3B8E2',
    400: '#6F8DCB',
    500: '#3A5BA6',
    600: '#2F4A88',
    700: '#263C6E',
    DEFAULT: '#3A5BA6',
    soft: '#E4EBF7',
    pressed: '#2F4A88',
  },
  canvas: '#F6F4F0',
  surface: '#FFFFFF',
  fill: { DEFAULT: '#F1EEE8', deep: '#ECE8E1' },
  ink: {
    DEFAULT: '#1D1C1A',
    soft: '#3B3833',
    muted: '#6B675F',
    faint: '#77726A',
  },
  line: { DEFAULT: '#E8E3DA', strong: '#DCD6CB', soft: '#F0ECE5' },
  attention: {
    DEFAULT: '#B4561F',
    text: '#9A4A12',
    strong: '#A8551C',
    soft: '#FBEEE3',
    line: '#E9C7AA',
    ink: '#7A3A0E',
    deep: '#5E2C0A',
  },
  danger: '#A33A2A',
  avatar: [
    { bg: '#DCD5C9', ink: '#4A453D' }, // stone
    { bg: '#CFD6E2', ink: '#3B4456' }, // slate
  ],
  // legacy keys still read by older screens
  gray: { light: '#B5AFA4', DEFAULT: '#77726A', dark: '#4A453D' },
} as const;

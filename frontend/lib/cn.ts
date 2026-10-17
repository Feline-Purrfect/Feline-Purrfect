import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's default scale. Teach it our custom font sizes, otherwise it
// treats `text-heading` as a text COLOR and silently drops it when merged with `text-ink-muted`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['hero', 'title', 'card', 'heading', 'input', 'body', 'label', 'caption', 'micro', 'tab'] }],
      'font-family': [{ font: ['display', 'display-medium', 'body', 'body-medium', 'body-semibold', 'body-bold'] }],
      rounded: [{ rounded: ['chip', 'seg', 'field', 'tile', 'cta', 'card', 'sheet'] }],
    },
  },
});

/** Merge class names; later classes win. */
export const cn = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(' '));

import { Text } from '@/components/ds';
import { Fragment } from 'react';
import { View } from 'react-native';

// The model is told to write plain text with "- " bullets and occasional **bold**. This renders just
// that, so we don't need a Markdown library: paragraphs, bullet and numbered lists, bold spans.

type Block =
  { kind: 'p'; text: string } | { kind: 'li'; text: string; marker: string };

function toBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const raw of source.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (!line) flush();
    else if (bullet) {
      flush();
      blocks.push({ kind: 'li', text: bullet[1], marker: '•' });
    } else if (numbered) {
      flush();
      blocks.push({ kind: 'li', text: numbered[2], marker: `${numbered[1]}.` });
    } else paragraph.push(line.replace(/^#+\s*/, '')); // stray headings become plain text
  }
  flush();
  return blocks;
}

/** "a **b** c" → text with the bold span in the semibold face. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text
            key={i}
            className="font-body-bold text-body leading-[22px] text-ink"
          >
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Fragment key={i}>{part.replace(/\*\*/g, '')}</Fragment>
        ),
      )}
    </>
  );
}

export function RichText({ text }: { text: string }) {
  const blocks = toBlocks(text);
  return (
    <View className="gap-2">
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <Text
            key={i}
            selectable
            className="font-body text-body leading-[22px] text-ink"
          >
            <Inline text={b.text} />
          </Text>
        ) : (
          <View key={i} className="flex-row gap-2 pr-1">
            <Text className="font-body-semibold text-body leading-[22px] text-ink-muted min-w-[14px]">
              {b.marker}
            </Text>
            <Text
              selectable
              className="flex-1 font-body text-body leading-[22px] text-ink"
            >
              <Inline text={b.text} />
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

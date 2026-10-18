import { AskComposer } from '@/components/ask/AskComposer';
import {
  AnswerCard,
  ThinkingRow,
  UserBubble,
} from '@/components/ask/AskMessageView';
import { ConsentSheet } from '@/components/ask/ConsentSheet';
import { SubjectChips } from '@/components/ask/SubjectChips';
import { CatAvatar } from '@/components/cats/CatAvatar';
import { Text } from '@/components/ds';
import { Colors } from '@/constants/colors';
import {
  askKeys,
  useAskConsent,
  useAskStatus,
  useAskThread,
  useReportAskMessage,
  useSendAsk,
} from '@/hooks/useAsk';
import { useCats } from '@/hooks/useCats';
import { todayYmd } from '@/lib/dates';
import { AskSubject } from '@/types/ask';
import { CatResponse } from '@/types/cat';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ComponentProps, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GENERAL_SUGGESTIONS = [
  'Which plants and foods are toxic to cats?',
  'How much water should an adult cat drink a day?',
  'How often should I brush my cat’s teeth?',
];

const catSuggestions = (name: string) => [
  `How has ${name} been this past week?`,
  `Is ${name}’s weight going up or down?`,
  `Anything unusual in ${name}’s litter box habits?`,
];

function HeaderButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      className="w-11 h-11 rounded-full border border-line bg-surface items-center justify-center active:bg-fill"
      style={disabled ? { opacity: 0.4 } : undefined}
    >
      <Feather name={icon} size={18} color={Colors.ink.DEFAULT} />
    </Pressable>
  );
}

function EmptyState({
  cat,
  onPick,
}: {
  cat: CatResponse | null;
  onPick: (q: string) => void;
}) {
  const suggestions = cat ? catSuggestions(cat.name) : GENERAL_SUGGESTIONS;
  return (
    <View className="flex-1 justify-center gap-6 py-4">
      <View className="items-center gap-2.5">
        {cat ? (
          <CatAvatar
            cat={cat}
            className="w-16 h-16 rounded-full"
            initialSize={26}
          />
        ) : (
          <View className="w-16 h-16 rounded-full bg-primary-soft items-center justify-center">
            <Feather
              name="message-circle"
              size={28}
              color={Colors.primary.pressed}
            />
          </View>
        )}
        <Text variant="card" className="text-center">
          {cat ? `Ask about ${cat.name}` : 'Ask about cat care'}
        </Text>
        <Text className="font-body text-body leading-[22px] text-ink-muted text-center px-4">
          {cat
            ? `Answers look at ${cat.name}’s logs from the last 30 days, and older ones when a question needs them.`
            : 'Food, behaviour, symptoms, toxic plants and more. General chats don’t use your logs.'}
        </Text>
      </View>
      <View className="gap-2">
        {suggestions.map((q) => (
          <Pressable
            key={q}
            onPress={() => onPick(q)}
            accessibilityRole="button"
            className="flex-row items-center gap-3 bg-surface border border-line rounded-tile px-4 py-3 active:bg-fill"
          >
            <Text className="flex-1 font-body-medium text-body text-ink">
              {q}
            </Text>
            <Feather name="arrow-up-right" size={16} color={Colors.ink.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const { data: cats = [], isSuccess: catsLoaded } = useCats();
  const status = useAskStatus();
  const consent = useAskConsent();
  const send = useSendAsk();
  const report = useReportAskMessage();

  const [subject, setSubject] = useState<AskSubject>('general');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null); // question waiting for its answer
  const [error, setError] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [queued, setQueued] = useState<string | null>(null); // question waiting for consent

  // /ask?threadId=…&subject=… (from Chat history) opens that chat. Handled once per request, during
  // render like the Logs tab, so the right chat shows on the first frame.
  const params = useLocalSearchParams<{
    threadId?: string;
    subject?: string;
    at?: string;
  }>();
  const requestKey =
    params.threadId || params.subject
      ? `${params.threadId}|${params.subject}|${params.at ?? ''}`
      : undefined;
  const [handledParam, setHandledParam] = useState<string | undefined>(
    undefined,
  );
  if (requestKey !== handledParam) {
    setHandledParam(requestKey);
    if (requestKey) {
      setSubject(params.subject || 'general');
      setThreadId(params.threadId || null);
      setError(null);
    }
  }

  const thread = useAskThread(threadId);
  // Derived rather than reset in effects: a chat deleted from Chat history falls back to a new chat,
  // and a cat that was deleted or archived since falls back to General.
  const activeThreadId = threadId && !thread.isError ? threadId : null;
  const messages = activeThreadId ? (thread.data?.messages ?? []) : [];
  const catGone =
    catsLoaded &&
    subject !== 'general' &&
    !activeThreadId &&
    !cats.some((c) => c.catId === subject);
  const activeSubject: AskSubject = catGone ? 'general' : subject;
  const subjectCat =
    activeSubject === 'general'
      ? null
      : (cats.find((c) => c.catId === activeSubject) ?? null);
  const subjectName =
    subjectCat?.name ??
    (activeThreadId ? thread.data?.thread.catName : null) ??
    null;

  const doSend = (text: string) => {
    setError(null);
    setPending(text);
    setDraft('');
    send.mutate(
      {
        message: text,
        threadId: activeThreadId ?? undefined,
        catId: activeThreadId
          ? undefined
          : activeSubject === 'general'
            ? null
            : activeSubject,
        today: todayYmd(),
      },
      {
        onSuccess: (result) => {
          setThreadId(result.thread.threadId);
          setPending(null);
        },
        onError: (e: any) => {
          setPending(null);
          if (e?.code === 'AskConsentRequired') {
            queryClient.invalidateQueries({ queryKey: askKeys.status });
            setQueued(text);
            setConsentOpen(true);
            return;
          }
          if (e?.code === 'NotFound' && activeThreadId) setThreadId(null); // chat deleted meanwhile
          setDraft(text);
          setError(e?.message || 'Couldn’t get an answer. Please try again.');
        },
      },
    );
  };

  const submit = (text: string = draft) => {
    const q = text.trim();
    if (!q || send.isPending) return;
    if (status.data && !status.data.consented) {
      setQueued(q);
      setConsentOpen(true);
      return;
    }
    doSend(q);
  };

  const allow = () =>
    consent.mutate(true, {
      onSuccess: () => {
        setConsentOpen(false);
        if (queued) doSend(queued);
        setQueued(null);
      },
    });

  const pickSubject = (s: AskSubject) => {
    if (send.isPending) return;
    setSubject(s);
    setThreadId(null);
    setError(null);
  };

  const unavailable = status.data?.available === false;
  const remaining = status.data?.remainingToday;
  const showEmpty = !activeThreadId && !pending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-canvas"
    >
      <View className="gap-3.5 pb-3" style={{ paddingTop: insets.top + 14 }}>
        <View className="px-5 flex-row items-center justify-between">
          <Text variant="title" accessibilityRole="header">
            Ask
          </Text>
          <View className="flex-row gap-2">
            <HeaderButton
              icon="clock"
              label="Chat history"
              onPress={() => router.push('/ask/history')}
            />
            <HeaderButton
              icon="edit"
              label="New chat"
              onPress={() => {
                setThreadId(null);
                setError(null);
              }}
              disabled={!activeThreadId || send.isPending}
            />
          </View>
        </View>
        <SubjectChips
          cats={cats}
          value={activeSubject}
          onChange={pickSubject}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (!showEmpty) scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {showEmpty ? (
          <EmptyState cat={subjectCat} onPick={submit} />
        ) : (
          <>
            {activeThreadId && thread.isLoading && (
              <View className="py-10 items-center">
                <ActivityIndicator color={Colors.primary.DEFAULT} />
              </View>
            )}
            {messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.messageId} text={m.content} />
              ) : (
                <AnswerCard
                  key={m.messageId}
                  message={m}
                  onReport={(reason) =>
                    report.mutate({ messageId: m.messageId, reason })
                  }
                />
              ),
            )}
            {pending && (
              <>
                <UserBubble text={pending} pending />
                <ThinkingRow />
              </>
            )}
          </>
        )}
      </ScrollView>

      <View className="px-4 pt-2.5 pb-2.5 gap-1.5 border-t border-line bg-canvas">
        {error ? (
          <Text
            variant="caption"
            className="text-danger px-1"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : remaining != null && remaining <= 5 ? (
          <Text variant="caption" className="px-1">
            {remaining === 0
              ? 'No questions left today. Try again tomorrow.'
              : `${remaining} question${remaining === 1 ? '' : 's'} left today`}
          </Text>
        ) : null}
        {unavailable ? (
          <Text variant="caption" className="text-center py-3">
            Ask isn’t available right now. Please try again later.
          </Text>
        ) : (
          <AskComposer
            value={draft}
            onChange={setDraft}
            onSend={() => submit()}
            placeholder={
              subjectName ? `Ask about ${subjectName}…` : 'Ask about cat care…'
            }
            disabled={send.isPending || remaining === 0}
          />
        )}
        <Text variant="micro" className="text-center font-body">
          Ask uses AI and can make mistakes. It isn’t a vet.
        </Text>
      </View>

      <ConsentSheet
        visible={consentOpen}
        loading={consent.isPending}
        onAllow={allow}
        onClose={() => {
          setConsentOpen(false);
          if (queued) setDraft(queued);
          setQueued(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

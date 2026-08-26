import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, ApiError } from '../../../shared/api/client';
import { ChatBubble } from '../../../shared/components/ChatBubble';
import { FactChip } from '../../../shared/components/FactChip';
import { MicButton } from '../../../shared/components/MicButton';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { StatusBanner } from '../../../shared/components/StatusBanner';
import { ConsultationSummaryCard } from '../../../shared/components/ConsultationSummaryCard';
import { AnimatePresence } from '../../../shared/motion/AnimatePresence';
import { MotionView } from '../../../shared/motion/MotionView';
import { fadeInUp } from '../../../shared/motion/presets';
import { useMotionTransition } from '../../../shared/motion/useMotionTransition';
import { useVoiceInput } from '../../../shared/hooks/useVoiceInput';
import { speak } from '../../../shared/hooks/useTts';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, fonts, layout, radius, space, typography } from '../../../shared/theme';

export default function IntakeScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const {
    token,
    language,
    turns,
    chips,
    addTurns,
    appendAiMessage,
    consultationSummary,
  } = useSession();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /** After "Continue Talking", stay in chat — don't auto-jump back to summary. */
  const [followUpMode, setFollowUpMode] = useState(false);
  const turnCounter = useRef(1);
  const listRef = useRef<FlatList>(null);
  const { isRecording, start: startVoice, stop: stopVoice } = useVoiceInput({ language, token });
  const transition = useMotionTransition();

  const openSummary = useCallback(() => {
    setFollowUpMode(false);
    setReady(true);
  }, []);

  const onContinueTalking = useCallback(() => {
    setReady(false);
    setFollowUpMode(true);
    const prompt = t(language, 'continuePrompt');
    appendAiMessage(prompt);
    speak(prompt, language);
    // Scroll to the new prompt after layout
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [language, appendAiMessage]);

  const sendTurn = useCallback(
    async (content: string) => {
      if (!token || !sessionId || !content.trim()) return;
      setBusy(true);
      setError(null);
      const turnId = `turn-${sessionId.slice(0, 8)}-${String(turnCounter.current++).padStart(4, '0')}`;
      try {
        const res = await api.turn(sessionId, token, {
          turn_id: turnId,
          input_type: 'text',
          content: content.trim(),
          language,
        });
        addTurns(
          content.trim(),
          res.ai_message,
          res.fact_chips,
          res.phase,
          res.consultation_summary,
          Boolean(res.conversation_complete ?? res.ready_for_confirm),
        );
        speak(res.ai_message, language);
        setText('');
        const complete = Boolean(res.ready_for_confirm || res.conversation_complete);
        // First-time completion opens summary. Follow-up chat stays open; user opens summary manually.
        if (complete && res.consultation_summary && !followUpMode) {
          setReady(true);
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t(language, 'retrying');
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [token, sessionId, language, addTurns, followUpMode],
  );

  const onMicStart = async () => {
    if (isRecording || busy) return;
    setError(null);
    try {
      await startVoice();
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'MIC_DENIED'
          ? 'Microphone permission denied. Type instead.'
          : e instanceof Error && e.message === 'VOICE_UNSUPPORTED'
            ? 'Voice input is not supported in this browser. Type instead.'
            : 'Could not start voice input. Type instead.';
      setError(msg);
    }
  };

  const onMicStop = async () => {
    if (!isRecording || busy) return;
    setBusy(true);
    setError(null);
    try {
      const transcript = await stopVoice();
      if (!transcript.trim()) {
        setError('No speech was heard. Hold Speak for a moment, then talk, then tap again to send.');
        return;
      }
      await sendTurn(transcript);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error && e.message === 'VOICE_UNSUPPORTED'
            ? 'Voice input is not supported in this browser. Type instead.'
            : t(language, 'retrying');
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.shell}>
        {chips.length ? (
          <MotionView
            style={styles.chipsBar}
            initial={fadeInUp.initial}
            animate={fadeInUp.animate}
            transition={transition}
            layout
          >
            <Text style={styles.chipsLabel}>Understood so far</Text>
            <View style={styles.chipsRow}>
              {chips.map((c) => (
                <FactChip key={c.field} label={c.label} />
              ))}
            </View>
          </MotionView>
        ) : null}

        <View style={styles.chatPanel}>
          <FlatList
            ref={listRef}
            style={styles.chatList}
            data={turns}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => {
              if (followUpMode) listRef.current?.scrollToEnd({ animated: true });
            }}
            renderItem={({ item, index }) => (
              <ChatBubble
                speaker={item.speaker}
                text={item.text}
                index={index}
                onPlay={() => speak(item.text, language)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Tap Speak and tell us your problem</Text>
                <Text style={styles.emptyBody}>You can also type below if voice is not available.</Text>
              </View>
            }
          />
        </View>

        <AnimatePresence>
          {error ? (
            <MotionView
              key="error"
              style={styles.bannerWrap}
              initial={fadeInUp.initial}
              animate={fadeInUp.animate}
              exit={{ opacity: 0, y: -6 }}
              transition={transition}
            >
              <StatusBanner tone="error">{error}</StatusBanner>
            </MotionView>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {ready && consultationSummary ? (
            <MotionView
              key="ready"
              style={styles.readyWrap}
              initial={fadeInUp.initial}
              animate={fadeInUp.animate}
              exit={{ opacity: 0, y: -6 }}
              transition={transition}
            >
              <ConsultationSummaryCard summary={consultationSummary} language={language} />
              <View style={styles.actionRow}>
                <PrimaryButton
                  label={t(language, 'confirmSubmit') || 'Confirm & Submit'}
                  onPress={() => router.push(`/(patient)/confirm/${sessionId}`)}
                />
                <PrimaryButton
                  label={t(language, 'continueTalking') || 'Continue Talking'}
                  onPress={onContinueTalking}
                  variant="secondary"
                />
              </View>
            </MotionView>
          ) : null}
        </AnimatePresence>

        {!ready && followUpMode ? (
          <View style={styles.followUpBar}>
            <PrimaryButton
              label={t(language, 'backToSummary') || 'Back to summary'}
              onPress={openSummary}
              variant="secondary"
            />
          </View>
        ) : null}

        {!ready && (
          <View style={styles.composer}>
            <View style={styles.micWrap}>
              <MicButton
                isRecording={isRecording}
                processing={busy}
                disabled={busy}
                onStart={onMicStart}
                onStop={onMicStop}
              />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.fallbackLabel}>{t(language, 'typeInstead')}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  placeholder="Type your answer..."
                  placeholderTextColor={colors.inkMuted}
                  multiline
                  editable={!busy}
                />
                <PrimaryButton
                  label="Send"
                  compact
                  fullWidth={false}
                  onPress={() => sendTurn(text)}
                  disabled={busy || !text.trim()}
                />
              </View>
            </View>
          </View>
        )}
        {busy ? <ActivityIndicator color={colors.teal700} style={styles.loader} /> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.sand100 },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: layout.patientMax,
    alignSelf: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[4],
    gap: space[3],
  },
  chipsBar: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    marginTop: space[3],
    gap: space[3],
  },
  chipsLabel: { ...typography.label },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  chatPanel: {
    flex: 1,
    minHeight: 220,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  chatList: { flex: 1 },
  list: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[5],
    flexGrow: 1,
    gap: space[1],
  },
  empty: {
    flexGrow: 1,
    paddingVertical: space[8],
    paddingHorizontal: space[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  emptyTitle: { ...typography.title, textAlign: 'center' },
  emptyBody: { ...typography.bodyMuted, textAlign: 'center' },
  bannerWrap: {},
  readyWrap: {},
  followUpBar: {},
  actionRow: { gap: space[3], marginTop: space[4] },
  composer: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    gap: space[3],
  },
  micWrap: { alignItems: 'center', paddingTop: space[1] },
  textWrap: { gap: space[2] },
  fallbackLabel: { ...typography.caption, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[3],
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: colors.teal500,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    ...typography.body,
    lineHeight: 22,
    backgroundColor: colors.white,
  },
  loader: { marginTop: space[1] },
});

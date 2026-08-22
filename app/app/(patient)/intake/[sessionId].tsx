import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { AnimatePresence } from '../../../shared/motion/AnimatePresence';
import { MotionView } from '../../../shared/motion/MotionView';
import { fadeInUp } from '../../../shared/motion/presets';
import { useMotionTransition } from '../../../shared/motion/useMotionTransition';
import { useMicPermission } from '../../../shared/hooks/useMicPermission';
import { useVoiceInput } from '../../../shared/hooks/useVoiceInput';
import { speak } from '../../../shared/hooks/useTts';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, fonts, layout, radius, space, typography } from '../../../shared/theme';

export default function IntakeScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { token, language, turns, chips, addTurns } = useSession();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const turnCounter = useRef(1);
  const { ensure } = useMicPermission();
  const { isRecording, start: startVoice, stop: stopVoice } = useVoiceInput({ language, token });
  const transition = useMotionTransition();

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
        addTurns(content.trim(), res.ai_message, res.fact_chips);
        speak(res.ai_message, language);
        setText('');
        if (res.ready_for_confirm) setReady(true);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : t(language, 'retrying');
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [token, sessionId, language, addTurns],
  );

  const onMicStart = async () => {
    const ok = await ensure();
    if (!ok) {
      setError('Microphone permission denied. Type instead.');
      return;
    }
    setError(null);
    try {
      await startVoice();
    } catch {
      setError('Voice input is not supported here. Type instead.');
    }
  };

  const onMicStop = async () => {
    setBusy(true);
    setError(null);
    try {
      const transcript = await stopVoice();
      if (!transcript.trim()) {
        setError("I didn't catch that clearly — can you repeat, or type instead?");
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {chips.map((c) => (
                <FactChip key={c.field} label={c.label} />
              ))}
            </ScrollView>
          </MotionView>
        ) : null}

        <FlatList
          data={turns}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
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
          {ready ? (
            <MotionView
              key="ready"
              style={styles.readyWrap}
              initial={fadeInUp.initial}
              animate={fadeInUp.animate}
              exit={{ opacity: 0, y: -6 }}
              transition={transition}
            >
              <PrimaryButton
                label={t(language, 'submit')}
                onPress={() => router.push(`/(patient)/confirm/${sessionId}`)}
              />
            </MotionView>
          ) : null}
        </AnimatePresence>

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
  },
  chipsBar: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    marginTop: space[3],
    marginBottom: space[3],
    gap: space[2],
  },
  chipsLabel: { ...typography.label },
  list: { paddingBottom: space[4], flexGrow: 1 },
  empty: {
    paddingVertical: space[8],
    paddingHorizontal: space[4],
    alignItems: 'center',
    gap: space[2],
  },
  emptyTitle: { ...typography.title, textAlign: 'center' },
  emptyBody: { ...typography.bodyMuted, textAlign: 'center' },
  bannerWrap: { marginBottom: space[3] },
  readyWrap: { marginBottom: space[3] },
  composer: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    gap: space[4],
  },
  micWrap: { alignItems: 'center' },
  textWrap: { gap: space[2] },
  fallbackLabel: { ...typography.caption, textAlign: 'center' },
  inputRow: { gap: space[3] },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space[3],
    ...typography.body,
    backgroundColor: colors.sand100,
  },
  loader: { marginTop: space[2] },
});

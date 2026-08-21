import { useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { MicButton } from '../../../shared/components/MicButton';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { useMicPermission } from '../../../shared/hooks/useMicPermission';
import { speak } from '../../../shared/hooks/useTts';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, space, typeScale } from '../../../shared/theme';

export default function IntakeScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { token, language, turns, chips, addTurns } = useSession();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const turnCounter = useRef(1);
  const { ensure } = useMicPermission();

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
    setRecording(true);
  };

  const onMicStop = () => {
    setRecording(false);
    setError('Voice upload needs ASR endpoint configured. Type instead for now.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        data={turns}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          chips.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {chips.map((c) => (
                <View key={c.field} style={styles.chip}>
                  <Text style={styles.chipText}>{c.label}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null
        }
        renderItem={({ item }) => (
          <ChatBubble speaker={item.speaker} text={item.text} onPlay={() => speak(item.text, language)} />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {ready ? (
        <PrimaryButton
          label={t(language, 'submit')}
          onPress={() => router.push(`/(patient)/confirm/${sessionId}`)}
        />
      ) : null}
      <View style={styles.inputRow}>
        <MicButton
          isRecording={recording}
          processing={busy}
          disabled={busy}
          onStart={onMicStart}
          onStop={onMicStop}
        />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t(language, 'typeInstead')}
          placeholderTextColor={colors.inkMuted}
          multiline
          editable={!busy}
        />
        <PrimaryButton label="Send" onPress={() => sendTurn(text)} disabled={busy || !text.trim()} />
      </View>
      {busy ? <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface, padding: space[4] },
  list: { paddingBottom: space[4] },
  chips: { marginBottom: space[3], maxHeight: 44 },
  chip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    marginRight: space[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: typeScale.sm, color: colors.ink },
  inputRow: { gap: space[3], alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: space[3],
    fontSize: typeScale.body,
    color: colors.ink,
    backgroundColor: colors.surfaceAlt,
  },
  error: { color: colors.flagHigh, fontSize: typeScale.body, marginBottom: space[2] },
});

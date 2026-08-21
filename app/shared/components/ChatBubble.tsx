import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';

type Props = {
  speaker: 'ai' | 'patient';
  text: string;
  audioUrl?: string;
  onPlay?: () => void;
};

export function ChatBubble({ speaker, text, onPlay }: Props) {
  const ai = speaker === 'ai';
  return (
    <View style={[styles.row, ai ? styles.left : styles.right]}>
      <View style={[styles.bubble, ai ? styles.ai : styles.patient]}>
        <Text style={[styles.text, ai ? styles.aiText : styles.pText]}>{text}</Text>
        {ai ? (
          <Pressable onPress={onPlay} accessibilityLabel="Listen" style={styles.play}>
            <Text style={styles.playText}>Listen</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: space[3], flexDirection: 'row' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '86%',
    borderRadius: radius.card,
    padding: space[4],
  },
  ai: { backgroundColor: colors.primary },
  patient: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  text: { fontSize: typeScale.body, lineHeight: 24 },
  aiText: { color: colors.surface },
  pText: { color: colors.ink },
  play: { marginTop: space[2], alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  playText: { color: colors.accent, fontSize: typeScale.body, fontWeight: '600' },
});

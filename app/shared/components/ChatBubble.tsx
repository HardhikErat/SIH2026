import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, typeScale } from '../theme';

type Props = {
  speaker: 'ai' | 'patient';
  text: string;
  onPlay?: () => void;
};

export function ChatBubble({ speaker, text, onPlay }: Props) {
  const ai = speaker === 'ai';
  return (
    <View style={[styles.row, ai ? styles.left : styles.right]}>
      {ai ? <Text style={styles.avatar}>AI</Text> : null}
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
  row: { marginBottom: space[4], flexDirection: 'row', alignItems: 'flex-end', gap: space[2] },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDeep,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: typeScale.xs,
    fontFamily: fonts.bodySemiBold,
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    padding: space[4],
  },
  ai: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.sm,
  },
  patient: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomRightRadius: radius.sm,
  },
  text: { fontSize: typeScale.body, lineHeight: 24, fontFamily: fonts.body },
  aiText: { color: colors.surfaceElevated },
  pText: { color: colors.ink },
  play: { marginTop: space[3], alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  playText: { color: colors.accent, fontSize: typeScale.sm, fontFamily: fonts.bodySemiBold },
});

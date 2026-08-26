import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { bubbleEnter } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import { colors, fonts, radius, space, typography } from '../theme';

type Props = {
  speaker: 'ai' | 'patient';
  text: string;
  onPlay?: () => void;
  index?: number;
};

export function ChatBubble({ speaker, text, onPlay, index = 0 }: Props) {
  const ai = speaker === 'ai';
  const enter = bubbleEnter(speaker);
  const transition = useMotionTransition(0.2, index * 0.04);

  return (
    <MotionView
      style={[styles.row, ai ? styles.left : styles.right]}
      initial={enter.initial}
      animate={enter.animate}
      transition={transition}
      layout
    >
      <View style={[styles.bubble, ai ? styles.ai : styles.patient]}>
        <Text style={[styles.text, ai ? styles.aiText : styles.pText]}>{text}</Text>
        {ai ? (
          <Pressable onPress={onPlay} accessibilityLabel="Listen" style={styles.play}>
            <Text style={styles.playText}>Listen</Text>
          </Pressable>
        ) : null}
      </View>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: space[3], flexDirection: 'row', width: '100%' },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    gap: space[2],
  },
  ai: {
    backgroundColor: colors.teal700,
    borderBottomLeftRadius: radius.sm,
  },
  patient: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomRightRadius: radius.sm,
  },
  text: { ...typography.body, lineHeight: 24 },
  aiText: { color: colors.white },
  pText: { color: colors.ink },
  play: {
    marginTop: space[1],
    minHeight: 32,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  playText: {
    ...typography.caption,
    color: colors.sand200,
    fontFamily: fonts.uiSemiBold,
    lineHeight: 18,
    textAlign: 'center',
  },
});

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { bubbleEnter } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import { colors, fonts, radius, space, typography } from '../theme';
import { IconAttach } from './icons';

const airaLogo = require('../../assets/images/aira-logo.png');

type Props = {
  speaker: 'ai' | 'patient';
  text: string;
  onPlay?: () => void;
  index?: number;
  attachment?: { filename: string; facts?: string[] } | null;
};

export function ChatBubble({ speaker, text, onPlay, index = 0, attachment }: Props) {
  const ai = speaker === 'ai';
  const enter = bubbleEnter(speaker);
  const transition = useMotionTransition(0.2, index * 0.04);
  const showAttachment = !ai && Boolean(attachment?.filename);
  const facts = attachment?.facts?.filter(Boolean) ?? [];

  return (
    <MotionView
      style={[styles.row, ai ? styles.left : styles.right]}
      initial={enter.initial}
      animate={enter.animate}
      transition={transition}
      layout
    >
      {ai ? (
        <Image source={airaLogo} accessibilityLabel="Aira" style={styles.avatar} />
      ) : null}
      <View style={[styles.bubble, ai ? styles.ai : styles.patient]}>
        {ai ? <Text style={styles.aiLabel}>Aira</Text> : null}
        {showAttachment ? (
          <View style={styles.attachBadge}>
            <IconAttach size={16} color={colors.teal700} />
            <Text style={styles.attachName} numberOfLines={2}>
              {attachment!.filename}
            </Text>
          </View>
        ) : null}
        {showAttachment && facts.length > 0
          ? facts.map((fact, i) => (
              <Text key={`${fact}-${i}`} style={[styles.text, styles.pText]}>
                • {fact}
              </Text>
            ))
          : null}
        {(!showAttachment || (text && !text.startsWith('📎'))) && text ? (
          <Text style={[styles.text, ai ? styles.aiText : styles.pText]}>{text}</Text>
        ) : null}
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
  row: { marginBottom: space[3], flexDirection: 'row', width: '100%', alignItems: 'flex-end', gap: space[2] },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '82%',
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
  aiLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: fonts.uiSemiBold,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
  },
  attachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.tealSoft,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: space[2],
  },
  attachName: {
    ...typography.caption,
    color: colors.teal700,
    fontFamily: fonts.uiSemiBold,
    flexShrink: 1,
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

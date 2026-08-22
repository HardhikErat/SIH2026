import { StyleSheet, Text, View } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { scaleIn } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import { colors, fonts, radius, space, typography } from '../theme';

export function FactChip({ label }: { label: string }) {
  const transition = useMotionTransition(0.15);

  return (
    <MotionView
      style={styles.chip}
      layout
      initial={scaleIn.initial}
      animate={scaleIn.animate}
      transition={transition}
    >
      <View style={styles.dot} />
      <Text style={styles.text}>{label}</Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    marginRight: space[2],
    marginBottom: space[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.teal700,
  },
  text: {
    ...typography.caption,
    color: colors.teal700,
    fontFamily: fonts.uiSemiBold,
  },
});

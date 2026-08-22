import { StyleSheet, Text } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { motionDurations } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import { StatusTone, fonts, radius, space, statusPalette, typography } from '../theme';

type Props = {
  label: string;
  tone?: StatusTone;
};

/** Signature element — dot + label in a soft pill (design-system.md §5). */
export function StatusPill({ label, tone = 'neutral' }: Props) {
  const palette = statusPalette[tone];
  const transition = useMotionTransition(motionDurations.pill);

  return (
    <MotionView
      style={[styles.pill, { backgroundColor: palette.bg }]}
      accessibilityRole="text"
      layout
      initial={{ opacity: 0.85, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={transition}
      key={label}
    >
      <MotionView
        style={[styles.dot, { backgroundColor: palette.fg }]}
        layout
        transition={transition}
      />
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[2],
    paddingVertical: space[1],
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.label,
    textTransform: 'none',
    fontFamily: fonts.uiSemiBold,
    letterSpacing: 0,
  },
});

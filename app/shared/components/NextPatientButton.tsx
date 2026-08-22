import { StyleSheet, Text } from 'react-native';
import { MotionPressable } from '../motion/MotionPressable';
import { colors, fonts, radius, space, typography } from '../theme';

export function NextPatientButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <MotionPressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled && styles.off]}
      accessibilityRole="button"
      accessibilityLabel="Next Patient"
    >
      <Text style={styles.label}>Next patient</Text>
      <Text style={styles.text}>{disabled ? 'No one waiting right now' : 'Open summary'}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 72,
    backgroundColor: colors.teal700,
    borderRadius: radius.card,
    justifyContent: 'center',
    paddingHorizontal: space[5],
    paddingVertical: space[4],
    gap: space[1],
  },
  off: { opacity: 0.45 },
  label: {
    ...typography.label,
    color: 'rgba(255,255,255,0.75)',
  },
  text: {
    ...typography.title,
    color: colors.white,
    fontFamily: fonts.uiSemiBold,
  },
});

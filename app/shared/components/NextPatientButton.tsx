import { StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from '../motion/MotionPressable';
import { colors, fonts, radius, shadow, space, typography } from '../theme';
import { IconArrowRight } from './icons';

export function NextPatientButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <MotionPressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled && styles.off]}
      accessibilityRole="button"
      accessibilityLabel="Next Patient"
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>Next patient</Text>
          <Text style={styles.text}>{disabled ? 'No one waiting right now' : 'Open summary'}</Text>
        </View>
        {!disabled ? <IconArrowRight size={22} color={colors.white} /> : null}
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 72,
    backgroundColor: colors.teal500,
    borderRadius: radius.lg,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    paddingVertical: space[4],
    ...shadow.glow,
  },
  off: { opacity: 0.45 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    width: '100%',
  },
  copy: { flex: 1, gap: space[1] },
  label: {
    ...typography.label,
    color: 'rgba(255,255,255,0.8)',
  },
  text: {
    ...typography.title,
    color: colors.white,
    fontFamily: fonts.uiSemiBold,
  },
});

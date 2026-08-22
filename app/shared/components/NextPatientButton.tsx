import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, shadow, space, typeScale } from '../theme';

export function NextPatientButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, disabled && styles.off, pressed && !disabled && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Next Patient"
    >
      <Text style={styles.label}>Next patient</Text>
      <Text style={styles.text}>{disabled ? 'Queue is empty' : 'Open summary →'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 72,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: space[5],
    paddingVertical: space[4],
    gap: space[1],
    ...shadow.elevated,
  },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.92 },
  label: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: typeScale.sm,
    fontFamily: fonts.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  text: { color: colors.surfaceElevated, fontSize: typeScale.lg, fontFamily: fonts.display },
});

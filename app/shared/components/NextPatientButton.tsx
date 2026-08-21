import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';

export function NextPatientButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, disabled && styles.off]}
      accessibilityRole="button"
      accessibilityLabel="Next Patient"
    >
      <Text style={styles.text}>Next Patient</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[5],
  },
  off: { opacity: 0.4 },
  text: { color: colors.surface, fontSize: typeScale.md, fontWeight: '700' },
});

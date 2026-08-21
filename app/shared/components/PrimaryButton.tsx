import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        variant === 'secondary' && styles.sec,
        disabled && styles.off,
      ]}
      accessibilityRole="button"
    >
      <Text style={[styles.text, variant === 'secondary' && styles.secText]}>{label}</Text>
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
    marginVertical: space[2],
  },
  sec: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  off: { opacity: 0.45 },
  text: { color: colors.surface, fontSize: typeScale.md, fontWeight: '700' },
  secText: { color: colors.ink },
});

import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, space, typeScale } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.compact,
        variant === 'secondary' && styles.sec,
        variant === 'ghost' && styles.ghost,
        disabled && styles.off,
        pressed && !disabled && styles.pressed,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.text,
          variant === 'secondary' && styles.secText,
          variant === 'ghost' && styles.ghostText,
        ]}
      >
        {label}
      </Text>
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
    marginVertical: space[1],
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: space[4],
  },
  sec: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.9 },
  text: {
    color: colors.surfaceElevated,
    fontSize: typeScale.md,
    fontFamily: fonts.bodySemiBold,
  },
  secText: { color: colors.ink },
  ghostText: { color: colors.primary },
});

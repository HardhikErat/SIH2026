import { StyleSheet, Text } from 'react-native';
import { MotionPressable } from '../motion/MotionPressable';
import { colors, fonts, radius, space, touchMin, typography } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  compact,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'text';
  compact?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        fullWidth && styles.full,
        compact && styles.compact,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.sec,
        variant === 'text' && styles.textBtn,
        disabled && styles.off,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' && styles.secLabel,
          variant === 'text' && styles.textLabel,
        ]}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: touchMin,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[5],
    marginVertical: space[1],
  },
  primary: {
    backgroundColor: colors.navy800,
  },
  full: { alignSelf: 'stretch' },
  compact: {
    minHeight: 44,
    paddingHorizontal: space[4],
    alignSelf: 'auto',
  },
  sec: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.navy700,
  },
  textBtn: {
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  off: { opacity: 0.45 },
  label: {
    color: colors.white,
    fontSize: typography.body.fontSize,
    fontFamily: fonts.uiSemiBold,
  },
  secLabel: { color: colors.navy800 },
  textLabel: { color: colors.navy800 },
});

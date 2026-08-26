import { StyleSheet, Text } from 'react-native';
import { MotionPressable } from '../motion/MotionPressable';
import { colors, fonts, radius, shadow, space, touchMin } from '../theme';

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
    paddingHorizontal: space[6],
    paddingVertical: space[4],
    marginVertical: space[1],
  },
  primary: {
    backgroundColor: colors.teal500,
    borderWidth: 0,
    ...shadow.glow,
  },
  full: { alignSelf: 'stretch', width: '100%' },
  compact: {
    minHeight: 48,
    minWidth: 88,
    paddingHorizontal: space[5],
    paddingVertical: space[3],
    alignSelf: 'auto',
    marginVertical: 0,
  },
  sec: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal700,
    shadowOpacity: 0,
    elevation: 0,
  },
  textBtn: {
    backgroundColor: 'transparent',
    minHeight: 44,
    paddingVertical: space[2],
    shadowOpacity: 0,
    elevation: 0,
  },
  off: { opacity: 0.45 },
  label: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.uiSemiBold,
    textAlign: 'center',
    width: '100%',
  },
  secLabel: { color: colors.teal700 },
  textLabel: { color: colors.navy800 },
});

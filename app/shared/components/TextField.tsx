import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, space, typography } from '../theme';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
  label: { ...typography.label },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: typography.body.fontSize,
    fontFamily: typography.body.fontFamily,
    color: colors.ink,
    backgroundColor: colors.surfaceElevated,
  },
  inputError: { borderColor: colors.flagHigh },
  hint: { ...typography.caption },
  error: { ...typography.caption, color: colors.flagHigh },
});

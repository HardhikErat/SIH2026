import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '../theme';

type Props = {
  label: string;
  value: string;
  source: 'AI_GENERATED' | 'DOCTOR_VERIFIED';
  onChange: (v: string) => void;
};

export function EditableField({ label, value, source, onChange }: Props) {
  const pending = source === 'AI_GENERATED';
  return (
    <View style={[styles.wrap, pending && styles.pendingWrap]}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.tag, pending ? styles.pending : styles.ok]}>
          {pending ? 'AI-suggested' : 'Verified'}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, pending && styles.dash]}
        placeholder="Not answered yet"
        placeholderTextColor={colors.inkMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    marginBottom: space[3],
  },
  pendingWrap: { borderStyle: 'dashed', borderColor: colors.accent },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[2] },
  label: { ...typography.h3 },
  tag: { ...typography.caption, fontFamily: fonts.bodySemiBold },
  pending: { color: colors.accent },
  ok: { color: colors.flagLow },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    fontSize: typography.body.fontSize,
    fontFamily: fonts.body,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  dash: { borderStyle: 'dashed', borderColor: colors.accent },
});

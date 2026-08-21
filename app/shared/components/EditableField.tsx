import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';

type Props = {
  label: string;
  value: string;
  source: 'AI_GENERATED' | 'DOCTOR_VERIFIED';
  onChange: (v: string) => void;
};

export function EditableField({ label, value, source, onChange }: Props) {
  const pending = source === 'AI_GENERATED';
  return (
    <View style={styles.wrap}>
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
  wrap: { marginBottom: space[4] },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: typeScale.body, color: colors.ink, fontWeight: '600' },
  tag: { fontSize: typeScale.sm },
  pending: { color: colors.accent },
  ok: { color: colors.flagLow },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    fontSize: typeScale.body,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  dash: { borderStyle: 'dashed', borderColor: colors.accent },
});

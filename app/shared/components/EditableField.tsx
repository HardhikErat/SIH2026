import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '../theme';
import { StatusPill } from './StatusPill';

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
        <StatusPill label={pending ? 'AI-suggested' : 'Verified'} tone={pending ? 'wait' : 'ok'} />
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
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    marginBottom: space[3],
    gap: space[3],
  },
  pendingWrap: { borderStyle: 'dashed', borderColor: colors.statusWait },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  label: { ...typography.body, fontFamily: fonts.uiSemiBold },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    ...typography.body,
    backgroundColor: colors.sand100,
  },
  dash: { borderStyle: 'dashed', borderColor: colors.statusWait },
});

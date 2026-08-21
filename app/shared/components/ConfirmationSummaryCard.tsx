import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';

type Field = { label: string; value: string; unknown?: boolean };

export function ConfirmationSummaryCard({ fields }: { fields: Field[] }) {
  return (
    <View style={styles.card}>
      {fields.map((f) => (
        <View key={f.label} style={[styles.row, f.unknown && styles.unknown]}>
          <Text style={styles.label}>{f.label}</Text>
          <Text style={styles.value}>{f.unknown ? 'Not answered yet' : f.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { marginBottom: space[4] },
  unknown: { borderLeftWidth: 3, borderLeftColor: colors.flagMedium, paddingLeft: space[3] },
  label: { color: colors.inkMuted, fontSize: typeScale.sm, marginBottom: 4 },
  value: { color: colors.ink, fontSize: typeScale.body },
});

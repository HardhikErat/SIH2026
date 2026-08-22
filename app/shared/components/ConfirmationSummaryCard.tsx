import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, space, typography } from '../theme';

type Field = { label: string; value: string; unknown?: boolean };

export function ConfirmationSummaryCard({ fields }: { fields: Field[] }) {
  return (
    <View style={styles.card}>
      {fields.map((f, index) => (
        <View key={f.label} style={[styles.row, index < fields.length - 1 && styles.rowBorder, f.unknown && styles.unknown]}>
          <Text style={styles.label}>{f.label}</Text>
          <Text style={[styles.value, f.unknown && styles.unknownText]}>
            {f.unknown ? 'Not answered yet' : f.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  row: { padding: space[5], gap: space[1] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  unknown: {
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.flagMedium,
  },
  label: { ...typography.label },
  value: { ...typography.body, fontFamily: fonts.bodySemiBold },
  unknownText: { color: colors.inkMuted, fontFamily: fonts.body },
});

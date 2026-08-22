import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, space, typeScale } from '../theme';
import type { QueueItem } from '../api/client';

export function PatientQueueCard({
  patient,
  onSelect,
}: {
  patient: QueueItem;
  onSelect: () => void;
}) {
  const border =
    patient.priority_flag === 'HIGH'
      ? colors.flagHigh
      : patient.priority_flag === 'MEDIUM'
        ? colors.flagMedium
        : colors.flagLow;
  const wait = patient.wait_seconds != null ? `${Math.max(1, Math.round(patient.wait_seconds / 60))} min` : '—';
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.card, { borderLeftColor: border }, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.copy}>
        <Text style={styles.name}>{patient.display_name}</Text>
        <Text style={styles.meta}>{patient.chief_complaint ?? 'Intake pending'} · wait {wait}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: `${border}18` }]}>
        <Text style={[styles.pri, { color: border }]}>{patient.priority_flag}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: space[4],
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space[3],
    minHeight: 80,
    ...shadow.card,
  },
  pressed: { opacity: 0.94 },
  copy: { flex: 1, paddingRight: space[3] },
  name: { fontSize: typeScale.md, color: colors.ink, fontFamily: fonts.bodySemiBold },
  meta: { fontSize: typeScale.sm, color: colors.inkMuted, marginTop: 4, fontFamily: fonts.body },
  badge: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
  },
  pri: { fontSize: typeScale.sm, fontFamily: fonts.bodySemiBold },
});

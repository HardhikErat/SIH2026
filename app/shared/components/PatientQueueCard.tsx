import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';
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
    <Pressable onPress={onSelect} style={[styles.card, { borderLeftColor: border }]} accessibilityRole="button">
      <View>
        <Text style={styles.name}>{patient.display_name}</Text>
        <Text style={styles.meta}>{patient.chief_complaint ?? 'Intake'} · wait {wait}</Text>
      </View>
      <Text style={[styles.pri, { color: border }]}>{patient.priority_flag}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.card,
    padding: space[4],
    borderLeftWidth: 6,
    marginBottom: space[3],
    minHeight: 72,
  },
  name: { fontSize: typeScale.md, color: colors.ink, fontWeight: '600' },
  meta: { fontSize: typeScale.sm, color: colors.inkMuted, marginTop: 4 },
  pri: { fontSize: typeScale.sm, fontWeight: '700' },
});

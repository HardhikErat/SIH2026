import { StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from '../motion/MotionPressable';
import { MotionView } from '../motion/MotionView';
import { listItemEnter } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import type { QueueItem } from '../api/client';
import { colors, fonts, radius, space, typography } from '../theme';
import { StatusPill } from './StatusPill';

export function PatientQueueCard({
  patient,
  onSelect,
  index = 0,
}: {
  patient: QueueItem;
  onSelect: () => void;
  index?: number;
}) {
  const tone =
    patient.priority_flag === 'HIGH' ? 'urgent' : patient.priority_flag === 'MEDIUM' ? 'wait' : 'ok';
  const wait =
    patient.wait_seconds != null ? `~${Math.max(1, Math.round(patient.wait_seconds / 60))} min` : '—';
  const enter = listItemEnter(index);
  const transition = useMotionTransition(0.2, enter.delay);

  return (
    <MotionView initial={enter.initial} animate={enter.animate} transition={transition}>
      <MotionPressable onPress={onSelect} style={styles.card} accessibilityRole="button">
        <View style={styles.copy}>
          <Text style={styles.name}>{patient.display_name}</Text>
          <Text style={styles.meta}>{patient.chief_complaint ?? 'Intake pending'}</Text>
          <Text style={styles.wait}>Waiting · {wait}</Text>
        </View>
        <StatusPill
          label={
            patient.priority_flag === 'HIGH'
              ? 'Urgent — review now'
              : patient.priority_flag === 'MEDIUM'
                ? 'Moderate priority'
                : 'Routine'
          }
          tone={tone}
        />
      </MotionPressable>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: space[3],
    gap: space[3],
  },
  copy: { gap: space[1] },
  name: { ...typography.title, fontSize: typography.body.fontSize + 2 },
  meta: { ...typography.bodyMuted },
  wait: { ...typography.caption, fontFamily: fonts.data },
});

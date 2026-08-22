import { StyleSheet, Text, View } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { listItemEnter } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import { colors, fonts, radius, space, typography } from '../theme';

type Field = { label: string; value: string; unknown?: boolean };

export function ConfirmationSummaryCard({ fields }: { fields: Field[] }) {
  return (
    <View style={styles.card}>
      {fields.map((f, index) => (
        <SummaryRow key={f.label} field={f} index={index} isLast={index === fields.length - 1} />
      ))}
    </View>
  );
}

function SummaryRow({ field, index, isLast }: { field: Field; index: number; isLast: boolean }) {
  const enter = listItemEnter(index);
  const transition = useMotionTransition(0.2, enter.delay);

  return (
    <MotionView
      initial={enter.initial}
      animate={enter.animate}
      transition={transition}
      style={[styles.row, !isLast && styles.rowBorder, field.unknown && styles.unknown]}
    >
      <Text style={styles.label}>{field.label}</Text>
      <Text style={[styles.value, field.unknown && styles.unknownText]}>
        {field.unknown ? 'Not answered yet' : field.value}
      </Text>
    </MotionView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: { padding: space[4], gap: space[1] },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  unknown: {
    backgroundColor: 'rgba(185, 138, 45, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.statusWait,
  },
  label: { ...typography.label },
  value: { ...typography.body, fontFamily: fonts.uiSemiBold },
  unknownText: { ...typography.bodyMuted, fontFamily: fonts.ui },
});

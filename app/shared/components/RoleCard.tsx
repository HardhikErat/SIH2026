import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MotionPressable } from '../motion/MotionPressable';
import { colors, fonts, radius, shadow, space, typography } from '../theme';
import { StatusPill } from './StatusPill';

type Accent = 'patient' | 'doctor' | 'admin';

const accentColors: Record<Accent, string> = {
  patient: colors.teal500,
  doctor: colors.navy700,
  admin: colors.gold500,
};

type Props = {
  title: string;
  description: string;
  statusLabel?: string;
  icon?: string;
  accent?: Accent;
  onPress?: () => void;
  style?: ViewStyle;
};

export function RoleCard({ title, description, statusLabel, icon, accent = 'patient', onPress, style }: Props) {
  const accentColor = accentColors[accent];

  const content = (
    <>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        {statusLabel ? <StatusPill label={statusLabel} tone="neutral" /> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={[styles.action, { color: accentColor }]}>Continue →</Text>
      </View>
    </>
  );

  if (onPress) {
    return (
      <MotionPressable onPress={onPress} style={[styles.card, style]} accessibilityRole="button">
        {content}
      </MotionPressable>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow.elevated,
  },
  accentBar: { height: 4, width: '100%' },
  body: { padding: space[5], gap: space[3] },
  icon: { fontSize: 32 },
  title: { ...typography.title },
  description: { ...typography.bodyMuted },
  action: {
    ...typography.label,
    textTransform: 'none',
    fontFamily: fonts.uiSemiBold,
    marginTop: space[1],
  },
});

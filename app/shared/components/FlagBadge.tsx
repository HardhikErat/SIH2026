import { StyleSheet, Text, View } from 'react-native';
import { colors, space, typeScale } from '../theme';

type Props = {
  type: 'missing' | 'contradiction' | 'priority';
  severity?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  label: string;
};

export function FlagBadge({ type, severity, label }: Props) {
  const color =
    type === 'priority'
      ? severity === 'HIGH'
        ? colors.flagHigh
        : severity === 'MEDIUM'
          ? colors.flagMedium
          : colors.flagLow
      : colors.flagMedium;
  const icon = type === 'priority' ? (severity === 'HIGH' ? '!' : 'i') : '!';
  return (
    <View style={[styles.wrap, { borderColor: color }]} accessibilityLabel={`${type}: ${label}`}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    backgroundColor: colors.surface,
  },
  icon: { fontSize: typeScale.md, fontWeight: '700' },
  label: { fontSize: typeScale.body, color: colors.ink },
});

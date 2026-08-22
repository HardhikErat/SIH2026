import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, space, typography } from '../theme';

type Props = {
  title: string;
  description: string;
  badge?: string;
  onPress?: () => void;
  href?: string;
  accent?: string;
  style?: ViewStyle;
};

export function RoleCard({ title, description, badge, onPress, accent = colors.primary, style }: Props) {
  const content = (
  <>
      <View style={[styles.icon, { backgroundColor: `${accent}18` }]}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: `${accent}14` }]}>
              <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Text style={[styles.arrow, { color: accent }]}>→</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[5],
    ...shadow.card,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  copy: { flex: 1, gap: space[1] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  title: { ...typography.h3 },
  badge: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, fontFamily: typography.label.fontFamily },
  description: { ...typography.bodyMuted },
  arrow: { fontSize: 22, fontWeight: '600' },
});

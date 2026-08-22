import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, typography } from '../theme';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
};

export function AppHeader({ eyebrow, title, subtitle, align = 'left', children }: Props) {
  const centered = align === 'center';
  return (
    <View style={[styles.wrap, centered && styles.center]}>
      {eyebrow ? <Text style={[styles.eyebrow, centered && styles.centerText]}>{eyebrow}</Text> : null}
      <Text style={[styles.title, centered && styles.centerText]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, centered && styles.centerText]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2], marginBottom: space[2] },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  eyebrow: {
    ...typography.label,
    color: colors.primary,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodyMuted,
    maxWidth: 560,
  },
});

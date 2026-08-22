import { StyleSheet, Text, View } from 'react-native';
import { StatusTone, colors, fonts, radius, space, statusPalette, typography } from '../theme';

type Tone = StatusTone | 'info' | 'success' | 'warning' | 'error';

const map: Record<Tone, StatusTone> = {
  info: 'neutral',
  success: 'ok',
  warning: 'wait',
  error: 'urgent',
  ok: 'ok',
  wait: 'wait',
  urgent: 'urgent',
  neutral: 'neutral',
};

export function StatusBanner({ tone = 'info', children }: { tone?: Tone; children: string }) {
  const palette = statusPalette[map[tone]];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: `${palette.fg}33` }]}>
      <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[styles.text, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  text: {
    ...typography.body,
    flex: 1,
    fontFamily: fonts.uiSemiBold,
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '../theme';

type Tone = 'info' | 'success' | 'warning' | 'error';

const toneMap: Record<Tone, { bg: string; fg: string; border: string }> = {
  info: { bg: colors.primarySoft, fg: colors.primaryDeep, border: `${colors.primary}33` },
  success: { bg: '#EAF5EE', fg: colors.flagLow, border: `${colors.flagLow}33` },
  warning: { bg: colors.accentSoft, fg: '#8A5A24', border: `${colors.accent}44` },
  error: { bg: '#FCEEED', fg: colors.flagHigh, border: `${colors.flagHigh}33` },
};

export function StatusBanner({ tone = 'info', children }: { tone?: Tone; children: string }) {
  const palette = toneMap[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  text: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
  },
});

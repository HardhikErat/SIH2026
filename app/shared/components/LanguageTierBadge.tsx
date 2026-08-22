import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';

export function LanguageTierBadge({ tier }: { tier: number }) {
  if (tier <= 1) return null;
  const label = tier === 2 ? 'Beta accuracy' : 'Text-first';
  return (
    <View style={styles.badge} accessibilityLabel={label}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    marginTop: space[2],
    alignSelf: 'flex-start',
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal500,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
  text: { fontSize: typeScale.label, color: colors.inkMuted },
});

import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '../theme';

export function FactChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <View style={styles.dot} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
    marginRight: space[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  text: {
    ...typography.caption,
    color: colors.primaryDeep,
    fontFamily: fonts.bodySemiBold,
  },
});

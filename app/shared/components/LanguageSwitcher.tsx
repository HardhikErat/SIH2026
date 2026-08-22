import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '../theme';

type Props = {
  languageCode: string;
  onPress?: () => void;
};

export function LanguageSwitcher({ languageCode, onPress }: Props) {
  const label = languageCode.toUpperCase().slice(0, 2);
  return (
    <Pressable
      onPress={onPress}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={`Language: ${languageCode}`}
    >
      <Text style={styles.globe}>🌐</Text>
      <Text style={styles.code}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    minHeight: 40,
  },
  globe: { fontSize: 14 },
  code: {
    ...typography.label,
    textTransform: 'uppercase',
    color: colors.teal700,
    fontFamily: fonts.dataSemiBold,
  },
});

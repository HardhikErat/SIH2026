import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, space, typeScale } from '../theme';
import type { LanguageOption } from '../api/client';
import { LanguageTierBadge } from './LanguageTierBadge';

type Props = {
  languages: LanguageOption[];
  value: string;
  onChange: (code: string) => void;
  onPreview?: (lang: LanguageOption) => void;
};

export function LanguagePicker({ languages, value, onChange, onPreview }: Props) {
  const tier1 = languages.filter((l) => l.tier === 1);
  const rest = languages.filter((l) => l.tier !== 1);
  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>Common languages</Text>
      <View style={styles.grid}>
        {tier1.map((lang) => (
          <LangTile
            key={lang.code}
            lang={lang}
            selected={value === lang.code}
            onPress={() => onChange(lang.code)}
            onLongPress={() => onPreview?.(lang)}
          />
        ))}
      </View>
      <Text style={styles.section}>More languages</Text>
      <View style={styles.grid}>
        {rest.map((lang) => (
          <LangTile
            key={lang.code}
            lang={lang}
            selected={value === lang.code}
            onPress={() => onChange(lang.code)}
            onLongPress={() => onPreview?.(lang)}
          />
        ))}
      </View>
    </View>
  );
}

function LangTile({
  lang,
  selected,
  onPress,
  onLongPress,
}: {
  lang: LanguageOption;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lang.name}, ${lang.native_name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tile, selected && styles.tileOn]}
    >
      <Text style={[styles.native, selected && styles.nativeOn]}>{lang.native_name}</Text>
      <Text style={styles.en}>{lang.name}</Text>
      {lang.tier > 1 ? <LanguageTierBadge tier={lang.tier} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  section: {
    fontSize: typeScale.sm,
    fontFamily: fonts.bodySemiBold,
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    minWidth: 108,
    minHeight: 92,
    padding: space[4],
    borderRadius: radius.card,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    ...shadow.card,
  },
  tileOn: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primarySoft,
  },
  native: {
    fontSize: typeScale.md,
    color: colors.ink,
    fontFamily: fonts.bodySemiBold,
  },
  nativeOn: { color: colors.primaryDeep },
  en: { fontSize: typeScale.sm, color: colors.inkMuted, marginTop: 4, fontFamily: fonts.body },
});

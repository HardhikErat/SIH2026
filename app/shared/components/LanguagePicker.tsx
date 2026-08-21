import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, typeScale } from '../theme';
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
    <View>
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
      <Text style={styles.more}>More languages</Text>
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
      <Text style={styles.native}>{lang.native_name}</Text>
      <Text style={styles.en}>{lang.name}</Text>
      {lang.tier > 1 ? <LanguageTierBadge tier={lang.tier} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  more: {
    marginTop: space[5],
    marginBottom: space[3],
    color: colors.inkMuted,
    fontSize: typeScale.body,
  },
  tile: {
    minWidth: 104,
    minHeight: 88,
    padding: space[3],
    borderRadius: radius.card,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  tileOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.surface },
  native: { fontSize: typeScale.md, color: colors.ink, fontWeight: '600' },
  en: { fontSize: typeScale.sm, color: colors.inkMuted, marginTop: 4 },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, space, typography } from '../theme';
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
      <Text style={[styles.en, selected && styles.enOn]}>{lang.name}</Text>
      {lang.tier > 1 ? <LanguageTierBadge tier={lang.tier} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  section: { ...typography.label },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    minWidth: 100,
    minHeight: 88,
    padding: space[3],
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  tileOn: {
    borderColor: colors.teal500,
    borderWidth: 1.5,
    backgroundColor: colors.teal500,
  },
  native: {
    ...typography.body,
    fontFamily: fonts.notoSemiBold,
  },
  nativeOn: { color: colors.white },
  en: { ...typography.caption },
  enOn: { color: 'rgba(255,255,255,0.85)' },
});

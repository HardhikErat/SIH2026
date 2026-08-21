import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../../shared/api/client';
import { LanguagePicker } from '../../shared/components/LanguagePicker';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { t } from '../../shared/i18n';
import { useSession } from '../../shared/store/session';
import { colors, space, typeScale } from '../../shared/theme';
import { speak } from '../../shared/hooks/useTts';

export default function PatientEntry() {
  const [language, setLanguage] = useState('hi');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setLanguage: setStoreLang, setAudioConsent, start } = useSession();

  const langs = useQuery({ queryKey: ['languages'], queryFn: () => api.languages() });

  const onStart = async () => {
    setLoading(true);
    try {
      setStoreLang(language);
      setAudioConsent(consent);
      const res = await api.startSession({ language, audio_consent: consent });
      start(res.session_id, res.token, res.ai_message);
      speak(res.ai_message, language);
      router.push(`/(patient)/intake/${res.session_id}`);
    } finally {
      setLoading(false);
    }
  };

  if (langs.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.lead}>{t(language, 'start')}</Text>
      <LanguagePicker
        languages={langs.data?.languages ?? []}
        value={language}
        onChange={setLanguage}
        onPreview={(lang) => speak(lang.native_name, lang.code)}
      />
      <View style={styles.consentRow}>
        <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.primary }} />
        <Text style={styles.consent}>{t(language, 'consentAudio')}</Text>
      </View>
      <PrimaryButton label={t(language, 'start')} onPress={onStart} disabled={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space[5], gap: space[4] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  lead: { fontSize: typeScale.lg, color: colors.ink, marginBottom: space[3] },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[4] },
  consent: { flex: 1, fontSize: typeScale.body, color: colors.inkMuted },
});

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { api } from '../../shared/api/client';
import { AppHeader } from '../../shared/components/AppHeader';
import { Card } from '../../shared/components/Card';
import { LanguagePicker } from '../../shared/components/LanguagePicker';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { Screen } from '../../shared/components/Screen';
import { StatusPill } from '../../shared/components/StatusPill';
import { speak } from '../../shared/hooks/useTts';
import { t } from '../../shared/i18n';
import { useSession } from '../../shared/store/session';
import { colors, fonts, space, typography } from '../../shared/theme';

export default function PatientEntry() {
  const [language, setLanguage] = useState('hi');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setLanguage: setStoreLang, setAudioConsent, start } = useSession();

  const langs = useQuery({ queryKey: ['languages'], queryFn: () => api.languages() });
  const health = useQuery({ queryKey: ['health'], queryFn: () => api.health() });

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
        <Text style={styles.loading}>Finding available languages…</Text>
        <ActivityIndicator color={colors.teal700} style={{ marginTop: space[4] }} />
      </View>
    );
  }

  return (
    <Screen>
      <StatusPill
        label={health.data?.llm_live ? 'AI intake · live' : 'AI intake · demo mode'}
        tone={health.data?.llm_live ? 'ok' : 'wait'}
      />
      <AppHeader
        title={t(language, 'start')}
        subtitle="Choose your language, then tap Start. You can speak or type — whichever is easier."
      />

      <Card>
        <LanguagePicker
          languages={langs.data?.languages ?? []}
          value={language}
          onChange={setLanguage}
          onPreview={(lang) => speak(lang.native_name, lang.code)}
        />
      </Card>

      <Card style={styles.consentCard}>
        <View style={styles.consentRow}>
          <View style={styles.consentCopy}>
            <Text style={styles.consentTitle}>{t(language, 'consentAudio')}</Text>
            <Text style={styles.consentHint}>Optional. Helps improve voice recognition.</Text>
          </View>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.teal700 }} />
        </View>
      </Card>

      <PrimaryButton label={t(language, 'start')} onPress={onStart} disabled={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand100, padding: space[5] },
  loading: { ...typography.bodyMuted, textAlign: 'center' },
  consentCard: { paddingVertical: space[4] },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  consentCopy: { flex: 1, gap: space[1] },
  consentTitle: { ...typography.body, fontFamily: fonts.uiSemiBold },
  consentHint: { ...typography.caption },
});

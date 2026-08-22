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
import { speak } from '../../shared/hooks/useTts';
import { t } from '../../shared/i18n';
import { useSession } from '../../shared/store/session';
import { colors, space, typography } from '../../shared/theme';

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
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Screen>
      <AppHeader
        eyebrow="Patient"
        title={t(language, 'start')}
        subtitle="Choose your language, then speak or type. The assistant writes down your problem for the doctor."
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
            <Text style={styles.consentHint}>Optional. Helps improve recognition for your language.</Text>
          </View>
          <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      <PrimaryButton label={t(language, 'start')} onPress={onStart} disabled={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  consentCard: { paddingVertical: space[4] },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  consentCopy: { flex: 1, gap: space[1] },
  consentTitle: { ...typography.body, fontFamily: typography.h3.fontFamily },
  consentHint: { ...typography.caption },
});

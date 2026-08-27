import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View, TextInput, Pressable } from 'react-native';
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
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [aadhaar, setAadhaar] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { setLanguage: setStoreLang, setAudioConsent, start, sessionId, setDoctorToken } = useSession();

  // Kiosk privacy: clear registration fields whenever we land here without an active session.
  useFocusEffect(
    useCallback(() => {
      if (sessionId) return;
      setDoctorToken(null);
      setConsent(false);
      setLoading(false);
      setName('');
      setAge('');
      setGender(null);
      setAadhaar('');
      setFormError(null);
    }, [sessionId, setDoctorToken]),
  );

  const langs = useQuery({ queryKey: ['languages'], queryFn: () => api.languages() });
  const health = useQuery({ queryKey: ['health'], queryFn: () => api.health() });

  const aadhaarDigits = aadhaar.replace(/\D/g, '');
  const aadhaarValid = aadhaarDigits.length === 12;

  const onStart = async () => {
    if (!aadhaarValid) {
      setFormError('Enter a valid 12-digit Aadhaar number.');
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      setStoreLang(language);
      setAudioConsent(consent);
      const res = await api.startSession({
        language,
        audio_consent: consent,
        display_name: name.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        aadhaar_number: aadhaarDigits,
      });
      start(res.session_id, res.token, res.ai_message, {
        name: name.trim(),
        age,
        gender: gender || 'unknown',
      });
      speak(res.ai_message, language);
      router.push(`/(patient)/intake/${res.session_id}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not start session.');
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
        subtitle="Please enter your basic details and choose a language to begin."
      />

      <Card style={styles.formCard}>
        <Text style={styles.label}>{t(language, 'enterName') || 'Full Name'}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rahul Sharma"
          placeholderTextColor={colors.inkMuted}
        />

        <Text style={styles.label}>{t(language, 'enterAge') || 'Age'}</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          placeholder="e.g. 45"
          placeholderTextColor={colors.inkMuted}
          maxLength={3}
        />

        <Text style={styles.label}>{t(language, 'selectGender') || 'Gender'}</Text>
        <View style={styles.genderRow}>
          {['male', 'female', 'other'].map((g) => (
            <Pressable
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                {t(language, g) || g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Aadhaar number</Text>
        <TextInput
          style={styles.input}
          value={aadhaar}
          onChangeText={(v) => setAadhaar(v.replace(/[^\d\s-]/g, '').slice(0, 14))}
          keyboardType="number-pad"
          placeholder="12-digit Aadhaar"
          placeholderTextColor={colors.inkMuted}
          maxLength={14}
        />
        <Text style={styles.hint}>
          Used as your secure patient ID to find earlier visits. Stored hashed — not shown in full.
        </Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </Card>

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

      <PrimaryButton 
        label={t(language, 'start')} 
        onPress={onStart} 
        disabled={loading || !name.trim() || !age || !gender || !aadhaarValid} 
      />
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
  formCard: { padding: space[4], gap: space[4], marginBottom: space[4] },
  label: { ...typography.body, fontFamily: fonts.uiSemiBold, color: colors.ink },
  hint: { ...typography.caption, marginTop: -space[2] },
  error: { ...typography.caption, color: colors.statusUrgent },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: space[3],
    fontSize: 16,
    fontFamily: fonts.ui,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  genderRow: { flexDirection: 'row', gap: space[2] },
  genderBtn: {
    flex: 1,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: colors.teal700,
    borderColor: colors.teal700,
  },
  genderText: { ...typography.body, color: colors.ink },
  genderTextActive: { color: colors.white, fontFamily: fonts.uiSemiBold },
});

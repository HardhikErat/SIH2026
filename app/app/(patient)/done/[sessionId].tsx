import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../../shared/components/AppHeader';
import { ConsultationSummaryCard } from '../../../shared/components/ConsultationSummaryCard';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { StatusPill } from '../../../shared/components/StatusPill';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { fonts, space, typography } from '../../../shared/theme';

export default function DoneScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const { language, consultationSummary, reset } = useSession();

  const onNextPatient = () => {
    const previousSessionId = sessionId;
    reset();
    if (previousSessionId) {
      queryClient.removeQueries({ queryKey: ['summary', previousSessionId] });
    }
    router.replace('/(patient)/start');
  };

  return (
    <Screen>
      <StatusPill label="Waiting · with doctor soon" tone="wait" />
      <AppHeader
        title={t(language, 'waitDoctor')}
        subtitle="Your intake has been submitted. Please stay nearby — the doctor will call you when ready."
      />
      <Text style={styles.ref}>Token {sessionId?.slice(0, 8).toUpperCase()}</Text>

      {consultationSummary ? (
        <ConsultationSummaryCard summary={consultationSummary} language={language} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Consultation submitted successfully. Records are saved for the doctor.
          </Text>
        </View>
      )}

      <PrimaryButton label={t(language, 'nextPatient')} onPress={onNextPatient} />
      <Text style={styles.hint}>
        Starts a fresh registration for the next patient. This patient's records stay saved.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ref: { ...typography.caption, fontFamily: fonts.data, marginBottom: space[2] },
  fallback: { marginVertical: space[4], gap: space[2] },
  fallbackText: { ...typography.bodyMuted },
  hint: { ...typography.caption, textAlign: 'center', marginTop: space[2] },
});

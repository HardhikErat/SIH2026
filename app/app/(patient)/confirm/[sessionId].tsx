import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../shared/api/client';
import { AppHeader } from '../../../shared/components/AppHeader';
import { ConfirmationSummaryCard } from '../../../shared/components/ConfirmationSummaryCard';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { StatusBanner } from '../../../shared/components/StatusBanner';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors } from '../../../shared/theme';

function fieldRows(fields: Record<string, unknown>, missing: string[]) {
  const rows: { label: string; value: string; unknown?: boolean }[] = [];
  const map: [string, string][] = [
    ['chief_complaint', 'Main problem'],
    ['duration', 'Duration'],
    ['severity', 'Severity'],
    ['medications', 'Medicines'],
    ['allergies', 'Allergies'],
  ];
  for (const [key, label] of map) {
    const raw = fields[key];
    const unknown = missing.includes(key) || raw === 'unknown' || raw == null;
    const value =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? raw.join(', ')
          : raw != null
            ? JSON.stringify(raw)
            : '';
    rows.push({ label, value: unknown ? '' : value, unknown });
  }
  return rows;
}

export default function ConfirmScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { token, language } = useSession();

  const summary = useQuery({
    queryKey: ['summary', sessionId],
    queryFn: () => api.summary(sessionId!, token!),
    enabled: !!token && !!sessionId,
  });

  const onSubmit = async () => {
    await api.confirm(sessionId!, token!);
    router.replace(`/(patient)/done/${sessionId}`);
  };

  if (summary.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const fields = summary.data?.fields ?? {};
  const missing = summary.data?.missing_fields ?? [];

  return (
    <Screen>
      <AppHeader
        eyebrow="Review"
        title="Check your answers"
        subtitle={summary.data?.recap}
      />
      <StatusBanner tone="warning">AI-suggested · pending doctor verification</StatusBanner>
      <ConfirmationSummaryCard fields={fieldRows(fields, missing)} />
      <PrimaryButton label={t(language, 'yesSubmit')} onPress={onSubmit} />
      <PrimaryButton label={t(language, 'goBack')} variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
});

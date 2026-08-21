import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../shared/api/client';
import { ConfirmationSummaryCard } from '../../../shared/components/ConfirmationSummaryCard';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, space, typeScale } from '../../../shared/theme';

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
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const fields = summary.data?.fields ?? {};
  const missing = summary.data?.missing_fields ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.tag}>AI-suggested · pending verification</Text>
      <Text style={styles.recap}>{summary.data?.recap}</Text>
      <ConfirmationSummaryCard fields={fieldRows(fields, missing)} />
      <PrimaryButton label={t(language, 'yesSubmit')} onPress={onSubmit} />
      <PrimaryButton
        label={t(language, 'goBack')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space[5], gap: space[4], backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tag: { color: colors.accent, fontSize: typeScale.sm, fontWeight: '600' },
  recap: { fontSize: typeScale.body, color: colors.ink, lineHeight: 24 },
});

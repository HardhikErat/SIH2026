import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api, ApiError } from '../../../shared/api/client';
import { AppHeader } from '../../../shared/components/AppHeader';
import { ConfirmationSummaryCard } from '../../../shared/components/ConfirmationSummaryCard';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { StatusBanner } from '../../../shared/components/StatusBanner';
import { StatusPill } from '../../../shared/components/StatusPill';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors } from '../../../shared/theme';

const CONCEPT_LABELS: Record<string, string> = {
  SYM_FEVER: 'Fever',
  SYM_COUGH: 'Cough',
  SYM_HEADACHE: 'Headache',
  SYM_CHEST_PAIN: 'Chest pain',
  SYM_BREATHING: 'Breathing difficulty',
  SYM_VOMITING: 'Vomiting',
  SYM_BODY_PAIN: 'Body pain',
  SYM_DIARRHEA: 'Diarrhea',
  SYM_ABDOMINAL_PAIN: 'Abdominal pain',
};

function humanizeValue(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    if (CONCEPT_LABELS[raw]) return CONCEPT_LABELS[raw];
    if (raw.startsWith('SYM_')) return raw.replace(/^SYM_/, '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return humanizeValue(item);
        if (item && typeof item === 'object' && 'concept_id' in item) {
          return humanizeValue((item as { concept_id?: string }).concept_id);
        }
        if (item && typeof item === 'object' && 'raw_term' in item) {
          return String((item as { raw_term?: string }).raw_term ?? '');
        }
        return String(item);
      })
      .filter(Boolean)
      .join(', ');
  }
  return String(raw);
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

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
    const unknown = missing.includes(key) || raw === 'unknown' || raw == null || raw === '';
    rows.push({ label, value: unknown ? '' : humanizeValue(raw), unknown });
  }
  return rows;
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = normalizeParam(params.sessionId);
  const { token, language } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const summary = useQuery({
    queryKey: ['summary', sessionId],
    queryFn: () => api.summary(sessionId!, token!),
    enabled: !!token && !!sessionId,
  });

  const onSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    if (!sessionId || !token) {
      setSubmitError('Your session expired. Please start intake again.');
      return;
    }
    setSubmitting(true);
    try {
      await api.confirm(sessionId, token);
      router.replace(`/(patient)/done/${sessionId}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : t(language, 'retrying');
      setSubmitError(msg || 'Could not submit. Please try again.');
      setSubmitting(false);
    }
  };

  if (summary.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal700} size="large" />
      </View>
    );
  }

  if (summary.isError) {
    return (
      <Screen>
        <StatusBanner tone="error">
          {summary.error instanceof Error ? summary.error.message : 'Could not load summary.'}
        </StatusBanner>
        <PrimaryButton label={t(language, 'goBack')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const fields = summary.data?.fields ?? {};
  const missing = summary.data?.missing_fields ?? [];

  return (
    <Screen>
      <AppHeader title="Check your answers" subtitle={summary.data?.recap} />
      <StatusPill label="Pending doctor verification" tone="wait" />
      <ConfirmationSummaryCard fields={fieldRows(fields, missing)} />
      {submitError ? <StatusBanner tone="error">{submitError}</StatusBanner> : null}
      <PrimaryButton
        label={submitting ? 'Submitting…' : t(language, 'yesSubmit')}
        onPress={onSubmit}
        disabled={submitting || !token || !sessionId}
      />
      <PrimaryButton
        label={t(language, 'goBack')}
        variant="secondary"
        onPress={() => router.back()}
        disabled={submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand100 },
});

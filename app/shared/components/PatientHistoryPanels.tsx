import { StyleSheet, Text, View } from 'react-native';
import type { HistoricalInsight, MedicalHistoryEntry } from '../api/client';
import { colors, fonts, radius, space, typography } from '../theme';

function formatDate(iso?: string | null) {
  if (!iso) return 'Unknown date';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function HistoricalInsightsPanel({
  overview,
  insights,
  priorVisitCount,
}: {
  overview?: string;
  insights?: HistoricalInsight[];
  priorVisitCount?: number;
}) {
  const items = insights ?? [];
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>AI historical insights</Text>
      <Text style={styles.title}>Relevant prior findings</Text>
      <Text style={styles.overview}>
        {overview ||
          (priorVisitCount
            ? `${priorVisitCount} prior visit(s) on file.`
            : 'No prior consultations linked to this Aadhaar.')}
      </Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No linked historical signals for this complaint.</Text>
      ) : (
        items.map((item, index) => (
          <View
            key={`${item.title}-${item.prior_intake_id ?? index}`}
            style={[styles.insight, item.relevance === 'high' && styles.insightHigh]}
          >
            <Text style={styles.relevance}>{item.relevance.toUpperCase()} · {item.category}</Text>
            <Text style={styles.insightTitle}>{item.title}</Text>
            <Text style={styles.insightDetail}>{item.detail}</Text>
            {item.prior_date ? (
              <Text style={styles.meta}>From visit · {formatDate(item.prior_date)}</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

export function MedicalHistoryTimeline({ entries }: { entries?: MedicalHistoryEntry[] }) {
  const rows = entries ?? [];
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>Chronological record</Text>
      <Text style={styles.title}>Previous consultations</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>First visit for this patient ID.</Text>
      ) : (
        rows.map((entry) => (
          <View key={entry.intake_id} style={styles.historyCard}>
            <Text style={styles.meta}>{formatDate(entry.created_at)}</Text>
            <Text style={styles.insightTitle}>
              {String(entry.chief_complaint || 'Unspecified complaint').replace(/SYM_/g, '').replace(/_/g, ' ')}
            </Text>
            {entry.duration ? <Text style={styles.insightDetail}>Duration: {entry.duration}</Text> : null}
            {entry.ai_summary ? <Text style={styles.insightDetail}>{entry.ai_summary}</Text> : null}
            {entry.allergies && entry.allergies !== 'unknown' ? (
              <Text style={styles.insightDetail}>Allergies: {entry.allergies}</Text>
            ) : null}
            {entry.medications != null && entry.medications !== 'unknown' ? (
              <Text style={styles.insightDetail}>Medications: {String(entry.medications)}</Text>
            ) : null}
            {(entry.turn_history?.length ?? 0) > 0 ? (
              <Text style={styles.meta}>{entry.turn_history!.length} chat turns saved</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    gap: space[3],
  },
  eyebrow: {
    ...typography.caption,
    color: colors.gold500,
    fontFamily: fonts.uiSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { ...typography.title },
  overview: { ...typography.bodyMuted },
  empty: { ...typography.bodyMuted, fontStyle: 'italic' },
  insight: {
    borderLeftWidth: 3,
    borderLeftColor: colors.teal500,
    paddingLeft: space[3],
    gap: space[1],
    backgroundColor: colors.tealSoft,
    borderRadius: radius.card,
    paddingVertical: space[3],
    paddingRight: space[3],
  },
  insightHigh: {
    borderLeftColor: colors.statusUrgent,
    backgroundColor: 'rgba(185, 60, 45, 0.08)',
  },
  relevance: { ...typography.caption, fontFamily: fonts.uiSemiBold, color: colors.inkMuted },
  insightTitle: { ...typography.body, fontFamily: fonts.uiSemiBold },
  insightDetail: { ...typography.bodyMuted },
  meta: { ...typography.caption },
  historyCard: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space[3],
    gap: space[1],
  },
});

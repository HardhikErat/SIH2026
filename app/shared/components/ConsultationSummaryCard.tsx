import { StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { colors, fonts, space, typography } from '../theme';
import { Card } from './Card';

type Props = {
  summary: Record<string, any>;
  language: string;
};

function localizeGender(lang: string, value: unknown): string {
  if (value == null || value === '' || value === 'N/A') return 'N/A';
  const key = String(value).trim().toLowerCase();
  if (key === 'male') return t(lang, 'male');
  if (key === 'female') return t(lang, 'female');
  if (key === 'other') return t(lang, 'other');
  return String(value);
}

function localizeSeverity(lang: string, value: unknown): string {
  if (value == null || value === '') return '';
  const key = String(value).trim().toLowerCase();
  if (key === 'mild') return t(lang, 'severityMild') || 'mild';
  if (key === 'moderate') return t(lang, 'severityModerate') || 'moderate';
  if (key === 'severe') return t(lang, 'severitySevere') || 'severe';
  return String(value);
}

/** Prefer API-localized duration; fall back to client rewrite of English "N days". */
function displayDuration(lang: string, value: unknown): string {
  if (value == null || value === '') return '';
  const text = String(value).trim();
  if (/[\u0900-\u097F]/.test(text)) return text;
  const m = text.match(/^(\d+)\s*(day|days)$/i);
  if (!m) return text;
  const n = Number(m[1]);
  if (lang.startsWith('hi')) return `${n} दिन`;
  if (lang.startsWith('mr')) return `${n} दिवस`;
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

export function ConsultationSummaryCard({ summary, language }: Props) {
  const lang = language || 'en';
  const nextSteps: string[] =
    summary.recommended_next_steps || summary.suggested_next_steps || [];

  const hasStructuredPatient =
    summary.patient_name || summary.patient_age != null || summary.patient_gender;
  const patientLine = hasStructuredPatient
    ? [
        summary.patient_name || 'N/A',
        summary.patient_age != null && summary.patient_age !== ''
          ? `${summary.patient_age} ${t(lang, 'yrs')}`
          : 'N/A',
        localizeGender(lang, summary.patient_gender),
      ].join(', ')
    : String(summary.patient_details || 'N/A');

  return (
    <Card style={styles.card}>
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>
          {summary.ai_disclaimer || t(lang, 'aiDisclaimer')}
        </Text>
      </View>

      <Text style={styles.title}>{t(lang, 'consultationSummary')}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>{t(lang, 'patientDetails')}</Text>
        <Text style={styles.text}>{patientLine}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>{t(lang, 'mainComplaint')}</Text>
        <Text style={styles.text}>{summary.main_complaint || 'N/A'}</Text>
      </View>

      {summary.symptoms && summary.symptoms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'symptoms')}</Text>
          {summary.symptoms.map((s: string, i: number) => (
            <Text key={i} style={styles.bullet}>
              • {s}
            </Text>
          ))}
        </View>
      )}

      {summary.duration && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'duration')}</Text>
          <Text style={styles.text}>{displayDuration(lang, summary.duration)}</Text>
        </View>
      )}

      {summary.severity && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'severity') || 'Severity'}</Text>
          <Text style={styles.text}>{localizeSeverity(lang, summary.severity)}</Text>
        </View>
      )}

      {summary.current_medications && summary.current_medications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'medications') || 'Medications'}</Text>
          {summary.current_medications.map((m: string, i: number) => (
            <Text key={i} style={styles.bullet}>
              • {m}
            </Text>
          ))}
        </View>
      )}

      {summary.allergies && summary.allergies !== 'unknown' && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'allergies') || 'Allergies'}</Text>
          <Text style={styles.text}>
            {summary.allergies === 'none' ? t(lang, 'noneReported') || 'None reported' : String(summary.allergies)}
          </Text>
        </View>
      )}

      {summary.medical_history && summary.medical_history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'medicalHistory')}</Text>
          {summary.medical_history.map((m: string, i: number) => (
            <Text key={i} style={styles.bullet}>
              • {m}
            </Text>
          ))}
        </View>
      )}

      {summary.observations && summary.observations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'observations')}</Text>
          {summary.observations.map((o: string, i: number) => (
            <Text key={i} style={styles.bullet}>
              • {o}
            </Text>
          ))}
        </View>
      )}

      {nextSteps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t(lang, 'nextSteps')}</Text>
          {nextSteps.map((r: string, i: number) => (
            <Text key={i} style={styles.bullet}>
              • {r}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: space[4], gap: space[3], backgroundColor: colors.white, marginVertical: space[4] },
  disclaimerBox: {
    backgroundColor: colors.sand100,
    padding: space[2],
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold500,
    marginBottom: space[2],
  },
  disclaimerText: { ...typography.caption, color: colors.inkMuted },
  title: { ...typography.title, fontSize: 20, marginBottom: space[2] },
  section: { gap: space[1] },
  label: {
    ...typography.caption,
    fontFamily: fonts.uiSemiBold,
    color: colors.teal700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: { ...typography.body, color: colors.ink },
  bullet: { ...typography.body, color: colors.ink, paddingLeft: space[2] },
});

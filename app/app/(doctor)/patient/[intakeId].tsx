import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../shared/api/client';
import { AppHeader } from '../../../shared/components/AppHeader';
import { ConsultationSummaryCard } from '../../../shared/components/ConsultationSummaryCard';
import { EditableField } from '../../../shared/components/EditableField';
import { FlagBadge } from '../../../shared/components/FlagBadge';
import {
  HistoricalInsightsPanel,
  MedicalHistoryTimeline,
} from '../../../shared/components/PatientHistoryPanels';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { Screen } from '../../../shared/components/Screen';
import { StatusPill } from '../../../shared/components/StatusPill';
import { useSession } from '../../../shared/store/session';
import { colors, space, typography } from '../../../shared/theme';

export default function DoctorPatientDetail() {
  const { intakeId } = useLocalSearchParams<{ intakeId: string }>();
  const { doctorToken } = useSession();
  const [ackHigh, setAckHigh] = useState(false);

  const detail = useQuery({
    queryKey: ['intake', intakeId, doctorToken],
    queryFn: () => api.doctorIntake(intakeId!, doctorToken!),
    enabled: !!doctorToken && !!intakeId,
  });

  const fields = useMemo(() => {
    const d = detail.data;
    if (!d) return {};
    return {
      chief_complaint: String(d.chief_complaint ?? d.structured_fields?.chief_complaint ?? ''),
      duration: String(d.duration ?? d.structured_fields?.duration ?? 'unknown'),
      medications: String(d.medications ?? d.structured_fields?.medications ?? 'unknown'),
      allergies: String(d.allergies ?? 'unknown'),
    };
  }, [detail.data]);

  const [local, setLocal] = useState(fields);

  useEffect(() => {
    setLocal(fields);
  }, [fields]);

  if (detail.isLoading || !detail.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal700} size="large" />
      </View>
    );
  }

  const intake = detail.data;
  const verified = intake.status === 'DOCTOR_VERIFIED';
  const high = intake.priority_flag === 'HIGH';
  const patientName = String(
    intake.patient?.display_name ?? intake.structured_fields?.display_name ?? 'Patient intake',
  );

  const onSaveField = async (key: string, value: string) => {
    setLocal((s) => ({ ...s, [key]: value }));
    await api.patchIntake(intakeId!, doctorToken!, { [key]: value });
  };

  const onVerify = async () => {
    if (high && !ackHigh) {
      setAckHigh(true);
      return;
    }
    await api.verify(intakeId!, doctorToken!, high);
    router.replace('/(doctor)/queue');
  };

  return (
    <Screen doctor>
      <AppHeader
        eyebrow="Patient summary"
        title={patientName}
        subtitle={intake.ai_summary}
      />

      {intake.consultation_summary_en || intake.consultation_summary ? (
        <ConsultationSummaryCard
          summary={(intake.consultation_summary_en || intake.consultation_summary)!}
          language="en"
        />
      ) : null}

      <StatusPill
        label={
          intake.patient?.aadhaar_masked
            ? `Aadhaar ${intake.patient.aadhaar_masked} · ${intake.prior_visit_count ?? 0} prior visit(s)`
            : 'Current visit'
        }
        tone="wait"
      />

      {high ? <StatusPill label="Urgent — review before saving" tone="urgent" /> : null}

      <HistoricalInsightsPanel
        overview={intake.historical_insights_overview}
        insights={intake.historical_insights}
        priorVisitCount={intake.prior_visit_count}
      />

      {(intake.missing_information ?? []).map((m: string) => (
        <FlagBadge key={m} type="missing" label={`Missing: ${m}`} />
      ))}

      <EditableField
        label="Chief complaint"
        value={local.chief_complaint ?? ''}
        source={verified ? 'DOCTOR_VERIFIED' : 'AI_GENERATED'}
        onChange={(v: string) => onSaveField('chief_complaint', v)}
      />
      <EditableField
        label="Duration"
        value={local.duration ?? ''}
        source={verified ? 'DOCTOR_VERIFIED' : 'AI_GENERATED'}
        onChange={(v: string) => onSaveField('duration', v)}
      />
      <EditableField
        label="Medications"
        value={local.medications ?? ''}
        source={verified ? 'DOCTOR_VERIFIED' : 'AI_GENERATED'}
        onChange={(v: string) => onSaveField('medications', v)}
      />
      <EditableField
        label="Allergies"
        value={local.allergies ?? ''}
        source={verified ? 'DOCTOR_VERIFIED' : 'AI_GENERATED'}
        onChange={(v: string) => onSaveField('allergies', v)}
      />

      {(Array.isArray(intake.medical_history)
        ? intake.medical_history
        : Array.isArray(intake.structured_fields?.medical_history)
          ? (intake.structured_fields!.medical_history as unknown[])
          : []
      ).length > 0 ? (
        <View style={styles.docBlock}>
          <Text style={styles.docTitle}>From patient documents / history</Text>
          {(Array.isArray(intake.medical_history)
            ? intake.medical_history
            : (intake.structured_fields?.medical_history as unknown[])
          ).map((item: unknown, i: number) => (
            <Text key={i} style={styles.docLine}>
              • {String(item)}
            </Text>
          ))}
        </View>
      ) : null}

      {(intake.attached_documents as { filename?: string; key_facts?: string[] }[] | undefined)?.length ? (
        <View style={styles.docBlock}>
          <Text style={styles.docTitle}>Attached documents</Text>
          {(intake.attached_documents as { filename?: string; key_facts?: string[] }[]).map((doc, i) => (
            <View key={`${doc.filename}-${i}`} style={styles.docItem}>
              <Text style={styles.docFile}>{doc.filename || 'document'}</Text>
              {(doc.key_facts || []).map((fact, j) => (
                <Text key={j} style={styles.docLine}>
                  • {fact}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <MedicalHistoryTimeline entries={intake.medical_history_timeline} />

      {!verified ? (
        <PrimaryButton
          label={high && !ackHigh ? 'Acknowledge urgent flag' : 'Verify & Save'}
          onPress={onVerify}
        />
      ) : (
        <Text style={styles.ok}>Verified</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand100 },
  ok: { ...typography.title, color: colors.statusOk, textAlign: 'center', marginTop: space[4] },
  docBlock: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space[4],
    gap: space[2],
    marginBottom: space[3],
  },
  docTitle: { ...typography.label, color: colors.teal700 },
  docItem: { gap: space[1], marginBottom: space[2] },
  docFile: { ...typography.body, fontFamily: 'Inter_600SemiBold', color: colors.ink },
  docLine: { ...typography.bodyMuted, paddingLeft: space[2] },
});

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api, DoctorIntake } from '../../../shared/api/client';
import { AppHeader } from '../../../shared/components/AppHeader';
import { EditableField } from '../../../shared/components/EditableField';
import { FlagBadge } from '../../../shared/components/FlagBadge';
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
        title={String(intake.structured_fields?.display_name ?? 'Patient intake')}
        subtitle={intake.ai_summary}
      />

      {high ? <StatusPill label="Urgent — review before saving" tone="urgent" /> : null}

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
});

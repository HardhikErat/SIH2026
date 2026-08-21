import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, DoctorIntake } from '../../../shared/api/client';
import { EditableField } from '../../../shared/components/EditableField';
import { FlagBadge } from '../../../shared/components/FlagBadge';
import { PrimaryButton } from '../../../shared/components/PrimaryButton';
import { useSession } from '../../../shared/store/session';
import { colors, space, typeScale } from '../../../shared/theme';

export default function DoctorPatientDetail() {
  const { intakeId } = useLocalSearchParams<{ intakeId: string }>();
  const { doctorToken } = useSession();
  const [ackHigh, setAckHigh] = useState(false);
  const [saved, setSaved] = useState(false);

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
        <ActivityIndicator color={colors.primary} />
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
    setSaved(true);
    router.replace('/(doctor)/queue');
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {high ? (
        <View style={styles.banner}>
          <FlagBadge type="priority" severity="HIGH" label="Urgent priority flag — review before verify" />
        </View>
      ) : null}
      <Text style={styles.summary}>{intake.ai_summary}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space[4], gap: space[3], backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { backgroundColor: colors.surfaceAlt, padding: space[3], borderRadius: 12 },
  summary: { fontSize: typeScale.body, color: colors.ink, lineHeight: 24 },
  ok: { color: colors.flagLow, fontSize: typeScale.md, fontWeight: '700', marginTop: space[4] },
});

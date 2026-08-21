import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../shared/api/client';
import { NextPatientButton } from '../../shared/components/NextPatientButton';
import { PatientQueueCard } from '../../shared/components/PatientQueueCard';
import { useSession } from '../../shared/store/session';
import { colors, space, typeScale } from '../../shared/theme';

export default function DoctorQueue() {
  const { doctorToken } = useSession();
  const queue = useQuery({
    queryKey: ['queue', doctorToken],
    queryFn: () => api.queue(doctorToken!),
    enabled: !!doctorToken,
    refetchInterval: 8000,
  });

  if (!doctorToken) {
    router.replace('/(doctor)/login');
    return null;
  }

  if (queue.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const items = queue.data?.queue ?? [];
  const next = queue.data?.next_patient;

  return (
    <View style={styles.wrap}>
      <NextPatientButton
        disabled={!next}
        onPress={() => next && router.push(`/(doctor)/patient/${next.intake_id}`)}
      />
      <Text style={styles.h}>Waiting patients ({items.length})</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.intake_id}
        renderItem={({ item }) => (
          <PatientQueueCard patient={item} onSelect={() => router.push(`/(doctor)/patient/${item.intake_id}`)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No patients waiting.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space[4], backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h: { fontSize: typeScale.md, color: colors.ink, fontWeight: '600', marginVertical: space[3] },
  empty: { color: colors.inkMuted, fontSize: typeScale.body, marginTop: space[5], textAlign: 'center' },
});

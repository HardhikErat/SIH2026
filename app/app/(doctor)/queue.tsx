import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '../../shared/api/client';
import { AppHeader } from '../../shared/components/AppHeader';
import { NextPatientButton } from '../../shared/components/NextPatientButton';
import { PatientQueueCard } from '../../shared/components/PatientQueueCard';
import { Screen } from '../../shared/components/Screen';
import { useSession } from '../../shared/store/session';
import { colors, space, typography } from '../../shared/theme';

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
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const items = queue.data?.queue ?? [];
  const next = queue.data?.next_patient;

  return (
    <Screen doctor scroll={false} contentStyle={styles.content}>
      <AppHeader
        eyebrow="Queue"
        title="Who is next?"
        subtitle={`${items.length} patient${items.length === 1 ? '' : 's'} waiting for review.`}
      />
      <NextPatientButton
        disabled={!next}
        onPress={() => next && router.push(`/(doctor)/patient/${next.intake_id}`)}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.intake_id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PatientQueueCard patient={item} onSelect={() => router.push(`/(doctor)/patient/${item.intake_id}`)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No patients waiting. New intakes will appear here.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  content: { flex: 1, gap: space[4] },
  list: { flex: 1, width: '100%' },
  listContent: { paddingBottom: space[6] },
  empty: { ...typography.bodyMuted, marginTop: space[6], textAlign: 'center' },
});

import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../shared/components/Card';
import { Screen } from '../../../shared/components/Screen';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, space, typography } from '../../../shared/theme';

export default function DoneScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { language } = useSession();

  return (
    <Screen contentStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.icon}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.title}>{t(language, 'waitDoctor')}</Text>
        <Text style={styles.meta}>
          Your intake has been submitted. Please wait until the doctor calls you.
        </Text>
        <Text style={styles.ref}>Reference {sessionId?.slice(0, 8).toUpperCase()}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', flex: 1 },
  card: { alignItems: 'center', gap: space[4] },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { fontSize: 28, color: colors.primary, fontWeight: '700' },
  title: { ...typography.h2, textAlign: 'center' },
  meta: { ...typography.bodyMuted, textAlign: 'center' },
  ref: { ...typography.caption },
});

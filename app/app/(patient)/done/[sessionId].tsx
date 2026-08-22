import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../shared/components/Card';
import { Screen } from '../../../shared/components/Screen';
import { StatusPill } from '../../../shared/components/StatusPill';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, fonts, space, typography } from '../../../shared/theme';

export default function DoneScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { language } = useSession();

  return (
    <Screen contentStyle={styles.content}>
      <Card style={styles.card}>
        <StatusPill label="Waiting · with doctor soon" tone="wait" />
        <Text style={styles.title}>{t(language, 'waitDoctor')}</Text>
        <Text style={styles.meta}>
          Your intake has been submitted. Please stay nearby — the doctor will call you when ready.
        </Text>
        <Text style={styles.ref}>Token {sessionId?.slice(0, 8).toUpperCase()}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', flex: 1 },
  card: { gap: space[4], alignItems: 'flex-start' },
  title: { ...typography.title },
  meta: { ...typography.bodyMuted },
  ref: { ...typography.caption, fontFamily: fonts.data },
});

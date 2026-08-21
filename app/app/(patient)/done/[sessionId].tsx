import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { t } from '../../../shared/i18n';
import { useSession } from '../../../shared/store/session';
import { colors, space, typeScale } from '../../../shared/theme';

export default function DoneScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { language } = useSession();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t(language, 'waitDoctor')}</Text>
      <Text style={styles.meta}>Session {sessionId?.slice(0, 8)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space[6], justifyContent: 'center', backgroundColor: colors.surface },
  title: { fontSize: typeScale.lg, color: colors.ink, fontWeight: '600', textAlign: 'center' },
  meta: { marginTop: space[4], textAlign: 'center', color: colors.inkMuted, fontSize: typeScale.body },
});

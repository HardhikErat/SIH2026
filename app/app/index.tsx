import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, space, typeScale } from '../shared/theme';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Clinical Intake Assistant</Text>
      <Text style={styles.sub}>AI before the doctor, not instead of the doctor.</Text>
      <View style={styles.cards}>
        <Link href="/(patient)" style={styles.card}>
          <Text style={styles.cardTitle}>Patient</Text>
          <Text style={styles.cardBody}>Speak or type your problem in your language.</Text>
        </Link>
        <Link href="/(doctor)/login" style={styles.card}>
          <Text style={styles.cardTitle}>Doctor</Text>
          <Text style={styles.cardBody}>Review queue, edit, and Verify & Save.</Text>
        </Link>
        <Link href="/(admin)/camp-setup" style={styles.card}>
          <Text style={styles.cardTitle}>Camp admin</Text>
          <Text style={styles.cardBody}>Create camp and monitor throughput.</Text>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space[5], gap: space[4], minHeight: '100%' },
  title: { fontSize: typeScale.xl, color: colors.ink, fontWeight: '700' },
  sub: { fontSize: typeScale.body, color: colors.inkMuted, marginBottom: space[4] },
  cards: { gap: space[4] },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: space[5],
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
  },
  cardTitle: { fontSize: typeScale.lg, color: colors.primary, fontWeight: '700', marginBottom: 8 },
  cardBody: { fontSize: typeScale.body, color: colors.ink },
});

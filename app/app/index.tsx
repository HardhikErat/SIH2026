import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../shared/components/AppHeader';
import { RoleCard } from '../shared/components/RoleCard';
import { Screen } from '../shared/components/Screen';
import { colors, space, typography } from '../shared/theme';

export default function HomeScreen() {
  return (
    <Screen wide contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.brandMark}>
          <View style={styles.brandInner} />
        </View>
        <AppHeader
          align="center"
          eyebrow="Rural camp intake"
          title="Clinical Intake Assistant"
          subtitle="AI listens before the doctor. Patients speak in their language; clinicians review structured summaries in minutes."
        />
      </View>

      <View style={styles.cards}>
        <RoleCard
          title="Patient intake"
          description="Speak or type your problem. The assistant captures symptoms for the doctor — it does not diagnose."
          badge="Voice-first"
          accent={colors.primary}
          onPress={() => router.push('/(patient)')}
        />
        <RoleCard
          title="Doctor review"
          description="See the queue, edit AI-suggested fields, and Verify & Save before consultation."
          badge="Queue"
          accent={colors.primaryDeep}
          onPress={() => router.push('/(doctor)/login')}
        />
        <RoleCard
          title="Camp admin"
          description="Create a camp session and monitor throughput for today's health outreach."
          accent={colors.accent}
          onPress={() => router.push('/(admin)/camp-setup')}
        />
      </View>

      <Text style={styles.footer}>
        AI-suggested records stay pending until a doctor verifies them. Your data is handled for clinical intake only.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[7] },
  hero: {
    alignItems: 'center',
    gap: space[5],
    paddingTop: space[4],
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  cards: { gap: space[4], width: '100%' },
  footer: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 560,
    alignSelf: 'center',
    paddingBottom: space[4],
  },
});

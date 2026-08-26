import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { BrandMark, IconDoctor, IconHospital, IconStethoscope } from '../components/icons';
import { RoleCard } from '../components/RoleCard';
import { Screen } from '../components/Screen';
import { StatusPill } from '../components/StatusPill';
import { Stagger } from '../motion/Stagger';
import { colors, space, typography } from '../theme';

export default function LandingScreen() {
  return (
    <Screen wide contentStyle={styles.content}>
      <View style={styles.heroBand}>
        <View style={styles.brandRow}>
          <BrandMark size={40} />
          <StatusPill label="Camp intake · live" tone="ok" />
        </View>
        <AppHeader
          title="Clinical Intake Assistant"
          subtitle="Hospital-grade pre-consultation — voice-first, multilingual, doctor-verified."
        />
      </View>

      <Stagger>
        <RoleCard
          title="I am a patient"
          description="Share symptoms by voice or text in your language. A doctor reviews before consultation."
          statusLabel="Voice-first"
          icon={<IconStethoscope size={26} color={colors.teal700} />}
          accent="patient"
          onPress={() => router.push('/start')}
        />
        <RoleCard
          title="I am a doctor"
          description="Review AI summaries, edit fields, and verify before seeing the patient."
          statusLabel="Queue"
          icon={<IconDoctor size={26} color={colors.navy700} />}
          accent="doctor"
          onPress={() => router.push('/(doctor)/login')}
        />
        <RoleCard
          title="Camp admin"
          description="Set up today's outreach camp and monitor patient flow."
          icon={<IconHospital size={26} color={colors.gold500} />}
          accent="admin"
          onPress={() => router.push('/(admin)/camp-setup')}
        />
      </Stagger>

      <View style={styles.stats}>
        {[
          ['22+', 'Languages'],
          ['< 5 min', 'Avg intake'],
          ['100%', 'Doctor verified'],
        ].map(([value, label]) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.trust}>
        Your details are only shared with your doctor. AI suggestions stay pending until a clinician verifies them.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[6], paddingTop: space[5] },
  heroBand: { gap: space[4] },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[4],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stat: { flex: 1, minWidth: 90, gap: space[1] },
  statValue: { ...typography.headline, color: colors.navy800, fontSize: 28 },
  statLabel: { ...typography.caption },
  trust: { ...typography.caption, lineHeight: 22 },
});

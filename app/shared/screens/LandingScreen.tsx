import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BrandMark, IconDoctor, IconHospital, IconStethoscope } from '../components/icons';
import { PrimaryButton } from '../components/PrimaryButton';
import { RobotEyes } from '../components/RobotEyes';
import { RoleCard } from '../components/RoleCard';
import { Screen } from '../components/Screen';
import { StatusPill } from '../components/StatusPill';
import { Stagger } from '../motion/Stagger';
import { colors, fonts, space, typography } from '../theme';

export default function LandingScreen() {
  return (
    <Screen wide contentStyle={styles.content} style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <BrandMark size={36} />
          <StatusPill label="NABH-aligned workflow · Camp intake live" tone="ok" />
        </View>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Care begins before you see the doctor</Text>
            <Text style={styles.heroSubtitle}>
              Hospital-grade pre-consultation for outreach camps and OPD queues. Voice-first, multilingual, and always verified by a clinician before your visit.
            </Text>
            <View style={styles.ctaRow}>
              <PrimaryButton label="Start patient intake" onPress={() => router.push('/start')} fullWidth={false} />
              <PrimaryButton
                label="Doctor portal"
                variant="secondary"
                onPress={() => router.push('/(doctor)/login')}
                fullWidth={false}
              />
            </View>
            <View style={styles.heroStats}>
              {[
                ['22+', 'Languages supported'],
                ['< 5 min', 'Average intake time'],
                ['100%', 'Doctor verified'],
                ['24/7', 'Camp-ready PWA'],
              ].map(([value, label]) => (
                <View key={label} style={styles.stat}>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.heroRobot}>
            <RobotEyes idPrefix="landing" />
          </View>
        </View>
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

      <Text style={styles.trust}>
        Your details are only shared with your doctor. AI suggestions stay pending until a clinician verifies them.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.navy800 },
  content: { gap: space[6], paddingTop: space[4] },
  hero: {
    backgroundColor: '#1c4a6e',
    borderRadius: 24,
    padding: space[5],
    gap: space[5],
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap' },
  heroRow: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: space[5] },
  heroCopy: { flex: 1.1, minWidth: 0, gap: space[4] },
  heroRobot: { flex: 0.9, minWidth: 0, maxWidth: 360 },
  heroTitle: {
    ...typography.headline,
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.86)',
    lineHeight: 24,
  },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[4],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  stat: { flex: 1, minWidth: 90, gap: space[1] },
  statValue: { fontFamily: fonts.uiSemiBold, color: colors.white, fontSize: 24 },
  statLabel: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  trust: { ...typography.caption, lineHeight: 22, color: 'rgba(255,255,255,0.78)' },
});

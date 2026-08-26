import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RobotEyes } from '../shared/components/RobotEyes';
import { colors, fonts, space, typography } from '../shared/theme';

export default function RobotDemoScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Intake robot</Text>
        <Text style={styles.hint}>Move the pointer or drag across the face. Pupils follow, clamped to 20px inside the visor clips.</Text>
      </View>
      <View style={styles.stage}>
        <RobotEyes idPrefix="demo" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#05080f',
  },
  header: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
  back: {
    ...typography.caption,
    color: '#00f0ff',
    fontFamily: fonts.uiSemiBold,
  },
  title: {
    ...typography.headline,
    color: colors.white,
    fontSize: 28,
  },
  hint: {
    ...typography.caption,
    color: '#9bb4c8',
    lineHeight: 20,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[5],
  },
});

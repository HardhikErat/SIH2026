import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LanguageSwitcher } from '../../shared/components/LanguageSwitcher';
import { useSession } from '../../shared/store/session';
import { colors, fonts, space } from '../../shared/theme';

function BackHome() {
  return (
    <Pressable onPress={() => router.push('/')} accessibilityRole="button" style={styles.back}>
      <Text style={styles.backText}>Home</Text>
    </Pressable>
  );
}

export default function PatientLayout() {
  const { language } = useSession();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.sand100 },
        headerTintColor: colors.teal700,
        headerTitleStyle: { fontFamily: fonts.uiSemiBold, color: colors.ink, fontSize: 17 },
        headerShadowVisible: false,
        headerRight: () => <LanguageSwitcher languageCode={language || 'en'} />,
      }}
    >
      <Stack.Screen name="start" options={{ title: 'Start intake', headerLeft: () => <BackHome /> }} />
      <Stack.Screen name="intake/[sessionId]" options={{ title: 'Tell us your problem' }} />
      <Stack.Screen name="confirm/[sessionId]" options={{ title: 'Check your answers' }} />
      <Stack.Screen name="done/[sessionId]" options={{ title: 'Please wait', headerBackVisible: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: space[3], paddingVertical: space[2] },
  backText: { color: colors.teal700, fontFamily: fonts.uiSemiBold, fontSize: 15 },
});

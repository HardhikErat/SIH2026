import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, space } from '../../shared/theme';

function BackHome() {
  return (
    <Pressable onPress={() => router.push('/')} accessibilityRole="button" style={styles.back}>
      <Text style={styles.backText}>Home</Text>
    </Pressable>
  );
}

export default function PatientLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold, color: colors.ink },
        headerShadowVisible: false,
        headerRight: () => <BackHome />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Start intake' }} />
      <Stack.Screen name="intake/[sessionId]" options={{ title: 'Tell us your problem', headerRight: undefined }} />
      <Stack.Screen name="confirm/[sessionId]" options={{ title: 'Check your answers' }} />
      <Stack.Screen name="done/[sessionId]" options={{ title: 'Please wait', headerBackVisible: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: space[3], paddingVertical: space[2] },
  backText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 15 },
});

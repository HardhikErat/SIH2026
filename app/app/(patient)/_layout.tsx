import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ title: 'Choose language' }} />
      <Stack.Screen name="intake/[sessionId]" options={{ title: 'Tell us your problem' }} />
      <Stack.Screen name="confirm/[sessionId]" options={{ title: 'Check your answers' }} />
      <Stack.Screen name="done/[sessionId]" options={{ title: 'Please wait' }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#FBF9F6' } }}>
      <Stack.Screen name="login" options={{ title: 'Doctor login' }} />
      <Stack.Screen name="queue" options={{ title: 'Patient queue' }} />
      <Stack.Screen name="patient/[intakeId]" options={{ title: 'Patient summary' }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="camp-setup" options={{ title: 'Camp setup' }} />
    </Stack>
  );
}

import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, space } from '../../shared/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold, color: colors.ink },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="camp-setup"
        options={{
          title: 'Camp setup',
          headerLeft: () => (
            <Pressable onPress={() => router.push('/')} style={styles.back}>
              <Text style={styles.backText}>Home</Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  back: { paddingHorizontal: space[3], paddingVertical: space[2] },
  backText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 15 },
});

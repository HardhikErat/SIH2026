import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, space } from '../../shared/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.sand100 },
        headerTintColor: colors.teal700,
        headerTitleStyle: { fontFamily: fonts.uiSemiBold, color: colors.ink },
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
  backText: { color: colors.teal700, fontFamily: fonts.uiSemiBold, fontSize: 15 },
});

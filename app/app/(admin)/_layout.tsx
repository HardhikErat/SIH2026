import { Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radius, space } from '../../shared/theme';

const backStyles = StyleSheet.create({
  back: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.teal700,
    backgroundColor: colors.white,
    marginLeft: space[1],
  },
  backText: { color: colors.teal700, fontFamily: fonts.uiSemiBold, fontSize: 14 },
});

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
            <Pressable onPress={() => router.replace('/')} style={backStyles.back}>
              <Text style={backStyles.backText}>Home</Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}

import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../shared/api/client';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { useSession } from '../../shared/store/session';
import { colors, space, typeScale } from '../../shared/theme';

export default function DoctorLogin() {
  const [email, setEmail] = useState('doctor@camp.local');
  const [password, setPassword] = useState('camp-demo');
  const [error, setError] = useState<string | null>(null);
  const { setDoctorToken } = useSession();

  const onLogin = async () => {
    setError(null);
    try {
      const res = await api.doctorLogin(email, password);
      setDoctorToken(res.token);
      router.replace('/(doctor)/queue');
    } catch {
      setError('Email or password is not recognised.');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Doctor dashboard</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Password"
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <PrimaryButton label="Log in" onPress={onLogin} />
      <Text style={styles.demo}>Demo: doctor@camp.local / camp-demo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space[5], gap: space[3], backgroundColor: colors.surface },
  h: { fontSize: typeScale.lg, color: colors.ink, fontWeight: '700', marginBottom: space[3] },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: space[3],
    fontSize: typeScale.body,
    backgroundColor: colors.surfaceAlt,
  },
  err: { color: colors.flagHigh, fontSize: typeScale.body },
  demo: { marginTop: space[4], color: colors.inkMuted, fontSize: typeScale.sm },
});

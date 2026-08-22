import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../shared/api/client';
import { AppHeader } from '../../shared/components/AppHeader';
import { Card } from '../../shared/components/Card';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { Screen } from '../../shared/components/Screen';
import { StatusBanner } from '../../shared/components/StatusBanner';
import { TextField } from '../../shared/components/TextField';
import { useSession } from '../../shared/store/session';
import { colors, space, typography } from '../../shared/theme';

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
    <Screen>
      <AppHeader
        eyebrow="Doctor"
        title="Sign in to review intakes"
        subtitle="Review AI-generated summaries, edit fields, and Verify & Save before consultation."
      />

      <Card>
        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="doctor@camp.local"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
          />
          {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
          <PrimaryButton label="Log in" onPress={onLogin} />
        </View>
      </Card>

      <Text style={styles.demo}>Demo credentials: doctor@camp.local / camp-demo</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[4] },
  demo: { ...typography.caption, textAlign: 'center' },
});

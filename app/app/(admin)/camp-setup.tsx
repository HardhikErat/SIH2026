import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { api } from '../../shared/api/client';
import { AppHeader } from '../../shared/components/AppHeader';
import { Card } from '../../shared/components/Card';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { Screen } from '../../shared/components/Screen';
import { StatusBanner } from '../../shared/components/StatusBanner';
import { TextField } from '../../shared/components/TextField';
import { colors, space, typography } from '../../shared/theme';

export default function CampSetup() {
  const [name, setName] = useState('PHC Camp');
  const [location, setLocation] = useState('Rural CHC');
  const [organizer, setOrganizer] = useState('ASHA team');
  const [message, setMessage] = useState<string | null>(null);

  const onCreate = async () => {
    const login = await api.doctorLogin('admin@camp.local', 'camp-demo');
    const camp = (await api.createCamp(login.token, {
      name,
      location,
      organizer,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
    })) as { id?: string };
    setMessage(`Camp created successfully. ID: ${camp.id ?? 'ok'}`);
  };

  return (
    <Screen>
      <AppHeader
        eyebrow="Admin"
        title="Create camp session"
        subtitle="Set up today's outreach camp so patient intakes are grouped correctly."
      />
      <Card style={styles.form}>
        <TextField label="Camp name" value={name} onChangeText={setName} placeholder="PHC Camp" />
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Rural CHC" />
        <TextField label="Organizer" value={organizer} onChangeText={setOrganizer} placeholder="ASHA team" />
        <PrimaryButton label="Create camp" onPress={onCreate} />
      </Card>
      {message ? <StatusBanner tone="success">{message}</StatusBanner> : null}
      <Text style={styles.demo}>Demo admin: admin@camp.local / camp-demo</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space[4] },
  demo: { ...typography.caption, textAlign: 'center' },
});

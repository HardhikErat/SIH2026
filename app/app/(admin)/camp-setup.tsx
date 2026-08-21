import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../shared/api/client';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { colors, space, typeScale } from '../../shared/theme';

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
    setMessage(`Camp created: ${camp.id ?? 'ok'}`);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Create camp session</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Camp name" />
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Location" />
      <TextInput style={styles.input} value={organizer} onChangeText={setOrganizer} placeholder="Organizer" />
      <PrimaryButton label="Create camp" onPress={onCreate} />
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      <Text style={styles.demo}>Demo admin: admin@camp.local / camp-demo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space[5], gap: space[3], backgroundColor: colors.surface },
  h: { fontSize: typeScale.lg, fontWeight: '700', color: colors.ink },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: space[3],
    backgroundColor: colors.surfaceAlt,
  },
  msg: { color: colors.primary, fontSize: typeScale.body },
  demo: { color: colors.inkMuted, fontSize: typeScale.sm, marginTop: space[4] },
});

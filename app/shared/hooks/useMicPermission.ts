import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export function useMicPermission() {
  const [denied, setDenied] = useState(false);

  const ensure = useCallback(async () => {
    if (Platform.OS === 'web') {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
      } catch {
        setDenied(true);
        return false;
      }
    }
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      setDenied(true);
      return false;
    }
    return true;
  }, []);

  return { denied, ensure };
}

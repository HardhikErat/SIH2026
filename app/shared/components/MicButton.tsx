import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow, space, touchMin, typeScale } from '../theme';

type Props = {
  isRecording: boolean;
  processing?: boolean;
  error?: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function MicButton({ isRecording, processing, error, disabled, onStart, onStop }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      disabled={disabled || processing}
      onPress={isRecording ? onStop : onStart}
      style={({ pressed }) => [
        styles.btn,
        isRecording && styles.rec,
        error && styles.err,
        disabled && styles.off,
        pressed && styles.pressed,
      ]}
    >
      {processing ? (
        <ActivityIndicator color={colors.surfaceElevated} />
      ) : (
        <View style={styles.inner}>
          <View style={[styles.ring, isRecording && styles.ringActive]}>
            <View style={[styles.core, isRecording && styles.coreActive]} />
          </View>
          <Text style={styles.caption}>{isRecording ? 'Listening' : 'Speak'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: touchMin + 48,
    minHeight: touchMin + 48,
    borderRadius: radius.mic * 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[4],
    ...shadow.elevated,
  },
  rec: { backgroundColor: colors.primaryDeep },
  err: { backgroundColor: colors.flagHigh },
  off: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.98 }] },
  inner: { alignItems: 'center', gap: space[2] },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringActive: { borderColor: colors.accent },
  core: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  coreActive: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  caption: {
    color: colors.surfaceElevated,
    fontSize: typeScale.body,
    fontFamily: fonts.bodySemiBold,
  },
});

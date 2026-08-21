import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, touchMin } from '../theme';

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
      style={[
        styles.btn,
        isRecording && styles.rec,
        error && styles.err,
        disabled && styles.off,
      ]}
    >
      {processing ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <View style={styles.inner}>
          {isRecording ? <View style={styles.wave} /> : <View style={styles.dot} />}
          <Text style={styles.caption}>{isRecording ? 'Listening' : 'Speak'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 96,
    minHeight: 96,
    borderRadius: radius.mic * 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[4],
  },
  rec: { backgroundColor: colors.primaryDeep },
  err: { backgroundColor: colors.flagHigh },
  off: { opacity: 0.45 },
  inner: { alignItems: 'center', gap: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface },
  wave: { width: 36, height: 18, borderRadius: 4, backgroundColor: colors.accent },
  caption: { color: colors.surface, fontSize: 16, fontWeight: '600' },
});

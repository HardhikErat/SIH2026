import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { useReducedMotion } from '../motion/useReducedMotion';
import { colors, fonts, radius, space, touchMin, typography } from '../theme';

type Props = {
  isRecording: boolean;
  processing?: boolean;
  error?: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function MicButton({ isRecording, processing, error, disabled, onStart, onStop }: Props) {
  const reduced = useReducedMotion();

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
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.inner}>
          <MotionView
            style={[styles.ring, isRecording && styles.ringActive]}
            animate={
              isRecording && !reduced
                ? { scale: [1, 1.06, 1], opacity: [1, 0.85, 1] }
                : { scale: 1, opacity: 1 }
            }
            transition={
              isRecording && !reduced
                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
          >
            <View style={[styles.core, isRecording && styles.coreActive]} />
          </MotionView>
          <Text style={styles.caption}>{isRecording ? 'Listening' : 'Speak'}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: touchMin + 40,
    minHeight: touchMin + 40,
    borderRadius: radius.mic * 2,
    backgroundColor: colors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[4],
  },
  rec: { backgroundColor: colors.primaryDeep },
  err: { backgroundColor: colors.statusUrgent },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.92 },
  inner: { alignItems: 'center', gap: space[2] },
  ring: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringActive: { borderColor: colors.sand200 },
  core: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  coreActive: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.sand200,
  },
  caption: {
    ...typography.body,
    color: colors.white,
    fontFamily: fonts.uiSemiBold,
  },
});

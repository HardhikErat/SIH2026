import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { useReducedMotion } from '../motion/useReducedMotion';
import { colors, fonts, shadow, space, typography } from '../theme';
import { IconMicFilled } from './icons';

type Props = {
  isRecording: boolean;
  processing?: boolean;
  error?: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
};

const MIC_SIZE = 72;

export function MicButton({ isRecording, processing, error, disabled, onStart, onStop }: Props) {
  const reduced = useReducedMotion();

  return (
    <View style={styles.wrap}>
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
          <MotionView
            style={[styles.iconWrap, isRecording && styles.iconWrapActive]}
            animate={
              isRecording && !reduced
                ? { scale: [1, 1.08, 1], opacity: [1, 0.85, 1] }
                : { scale: 1, opacity: 1 }
            }
            transition={
              isRecording && !reduced
                ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
          >
            <IconMicFilled size={28} color={colors.white} />
          </MotionView>
        )}
      </Pressable>
      <Text style={[styles.caption, isRecording && styles.captionActive]}>
        {processing ? '…' : isRecording ? 'Listening' : 'Speak'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[2],
  },
  btn: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: colors.teal500,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow,
  },
  rec: { backgroundColor: colors.teal700 },
  err: { backgroundColor: colors.statusUrgent, shadowColor: colors.statusUrgent },
  off: { opacity: 0.45 },
  pressed: { opacity: 0.92 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  caption: {
    ...typography.caption,
    color: colors.teal700,
    fontFamily: fonts.uiSemiBold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  captionActive: { color: colors.teal700 },
});

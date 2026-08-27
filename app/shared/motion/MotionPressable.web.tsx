import { motion } from 'motion/react';
import { CSSProperties, ReactNode } from 'react';
import { PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { motionDurations, motionEase } from './presets';
import { useReducedMotion } from './useReducedMotion';

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function MotionPressable({ children, style, disabled, onPress }: Props) {
  const reduced = useReducedMotion();
  const flat = (StyleSheet.flatten(style) ?? {}) as CSSProperties;

  const handleActivate = (event?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    if (disabled || !onPress) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onPress({} as Parameters<NonNullable<PressableProps['onPress']>>[0]);
  };

  return (
    <motion.div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      style={{
        boxSizing: 'border-box',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...flat,
        // RN alignItems/justifyContent only apply with flex; motion.div is not a RN View
        display: 'flex',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      onClick={(event) => handleActivate(event)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          handleActivate(event);
        }
      }}
      whileHover={disabled || reduced ? undefined : { y: -1 }}
      whileTap={disabled || reduced ? undefined : { scale: 0.985 }}
      transition={{ duration: motionDurations.button, ease: motionEase }}
    >
      {children}
    </motion.div>
  );
}

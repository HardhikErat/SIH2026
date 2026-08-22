import { motion, type HTMLMotionProps } from 'motion/react';
import { CSSProperties, ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

export type MotionViewProps = HTMLMotionProps<'div'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function MotionView({ children, style, ...props }: MotionViewProps) {
  const flat = StyleSheet.flatten(style) as CSSProperties | undefined;
  return (
    <motion.div style={flat} {...props}>
      {children}
    </motion.div>
  );
}

export type MotionStyle = StyleProp<ViewStyle>;

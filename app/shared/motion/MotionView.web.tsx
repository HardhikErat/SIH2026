import { motion, type HTMLMotionProps } from 'motion/react';
import { CSSProperties, ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';

export type MotionViewProps = HTMLMotionProps<'div'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function MotionView({ children, style, ...props }: MotionViewProps) {
  const flat = (StyleSheet.flatten(style) ?? {}) as CSSProperties;
  const needsFlex =
    flat.display != null ||
    flat.gap != null ||
    flat.rowGap != null ||
    flat.columnGap != null ||
    flat.flex != null ||
    flat.flexDirection != null ||
    flat.alignItems != null ||
    flat.justifyContent != null ||
    flat.flexWrap != null;

  return (
    <motion.div
      style={{
        boxSizing: 'border-box',
        ...flat,
        ...(needsFlex
          ? {
              display: 'flex',
              flexDirection: flat.flexDirection ?? 'column',
            }
          : null),
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export type MotionStyle = StyleProp<ViewStyle>;

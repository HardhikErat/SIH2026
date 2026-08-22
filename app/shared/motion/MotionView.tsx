import { ReactNode } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';

export type MotionViewProps = ViewProps & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  layout?: unknown;
  layoutId?: string;
};

export function MotionView({ children, style, initial: _i, animate: _a, exit: _e, transition: _t, layout: _l, layoutId: _lid, ...rest }: MotionViewProps) {
  return (
    <View style={style} {...rest}>
      {children as ReactNode}
    </View>
  );
}

export type MotionStyle = StyleProp<ViewStyle>;

import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type Props = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function MotionPressable({ children, style, ...props }: Props) {
  return (
    <Pressable style={style} {...props}>
      {children}
    </Pressable>
  );
}

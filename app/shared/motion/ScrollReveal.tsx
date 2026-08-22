import { ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
  className?: string;
  style?: object;
};

export function ScrollReveal({ children }: Props) {
  return <>{children}</>;
}

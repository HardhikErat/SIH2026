import { motion } from 'motion/react';
import { CSSProperties, ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';

type Props = {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
  style?: CSSProperties;
  amount?: number;
};

const offsets = {
  up: { y: 48, x: 0 },
  left: { y: 0, x: -48 },
  right: { y: 0, x: 48 },
};

export function ScrollReveal({ children, delay = 0, direction = 'up', style, amount = 0.2 }: Props) {
  const reduced = useReducedMotion();
  const offset = offsets[direction];

  if (reduced) {
    return <div style={style}>{children}</div>;
  }

  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount, margin: '-60px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

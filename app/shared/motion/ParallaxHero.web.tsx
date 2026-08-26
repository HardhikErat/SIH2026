import { motion, useScroll, useTransform } from 'motion/react';
import { CSSProperties, ReactNode, useRef } from 'react';
import { colors } from '../theme';
import { useReducedMotion } from './useReducedMotion';

type Props = {
  children: ReactNode;
  style?: CSSProperties;
};

export function ParallaxHero({ children, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, reduced ? 1 : 0.15]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.06]);

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #0b3d66 0%, #134a73 55%, #0e3558 100%)',
          y,
          scale,
          opacity,
        }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '55%',
          height: '80%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,158,143,0.35) 0%, transparent 70%)',
          y: useTransform(scrollYProgress, [0, 1], [0, 80]),
        }}
      />
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-15%',
          width: '50%',
          height: '70%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,162,39,0.2) 0%, transparent 70%)',
          y: useTransform(scrollYProgress, [0, 1], [0, -60]),
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

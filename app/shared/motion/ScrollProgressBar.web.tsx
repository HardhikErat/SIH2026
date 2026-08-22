import { motion, useScroll, useSpring } from 'motion/react';
import { colors } from '../theme';

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${colors.gold500}, ${colors.teal400})`,
        transformOrigin: '0% 50%',
        scaleX,
        zIndex: 9999,
      }}
    />
  );
}

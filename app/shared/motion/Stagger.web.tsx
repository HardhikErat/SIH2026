import { motion } from 'motion/react';
import { Children, ReactElement, ReactNode } from 'react';
import { motionDurations, motionEase } from './presets';
import { useReducedMotion } from './useReducedMotion';

type Props = {
  children: ReactNode;
  stagger?: number;
};

export function Stagger({ children, stagger = motionDurations.stagger }: Props) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <>
      {items.map((child, index) => (
        <motion.div
          key={(child as ReactElement).key ?? index}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduced ? 0 : motionDurations.screen,
            ease: motionEase,
            delay: reduced ? 0 : index * stagger,
          }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}

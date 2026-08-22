import { useReducedMotion as useMotionReducedMotion } from 'motion/react';

export function useReducedMotion() {
  return useMotionReducedMotion() ?? false;
}

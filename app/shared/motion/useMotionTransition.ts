import { useReducedMotion } from './useReducedMotion';
import { motionDurations, motionEase } from './presets';

export function useMotionTransition(duration: number = motionDurations.screen, delay = 0) {
  const reduced = useReducedMotion();
  return {
    duration: reduced ? 0 : duration,
    delay: reduced ? 0 : delay,
    ease: motionEase,
  };
}

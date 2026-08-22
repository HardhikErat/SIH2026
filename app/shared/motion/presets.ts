/** Motion tokens — design-system.md §6 (200ms ease-out, no bounce). */
export const motionEase = [0, 0, 0.2, 1] as const;

export const motionDurations = {
  screen: 0.2,
  pill: 0.15,
  button: 0.15,
  stagger: 0.06,
} as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
};

export function bubbleEnter(speaker: 'ai' | 'patient') {
  return {
    initial: { opacity: 0, x: speaker === 'ai' ? -10 : 10, y: 6 },
    animate: { opacity: 1, x: 0, y: 0 },
  };
}

export function listItemEnter(index: number) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    delay: index * motionDurations.stagger,
  };
}

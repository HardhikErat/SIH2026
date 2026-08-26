/**
 * 900×1000 canvas geometry for the transparent full-body robot
 * (studio background removed; visor painted blank for the overlay).
 */

export const ROBOT_CANVAS = {
  width: 900,
  height: 1000,
} as const;

export const MAX_PUPIL_TRAVEL = 14;

export type EyeCenter = {
  readonly cx: number;
  readonly cy: number;
};

export type EyeSocket = EyeCenter & {
  readonly rx: number;
  readonly ry: number;
  readonly rotateDeg: number;
};

export type PupilMarkup = EyeCenter & {
  readonly rx: number;
  readonly ry: number;
  readonly catchlightPrimary: { readonly cx: number; readonly cy: number; readonly r: number; readonly opacity: number };
  readonly catchlightSecondary: { readonly cx: number; readonly cy: number; readonly r: number; readonly opacity: number };
};

/** Resting visor layout: pupils sit on the original upper visor eye marks. */
export const LEFT_EYE_SOCKET: EyeSocket = {
  cx: 374,
  cy: 242,
  rx: 42,
  ry: 38,
  rotateDeg: -3,
};

export const RIGHT_EYE_SOCKET: EyeSocket = {
  cx: 588,
  cy: 242,
  rx: 42,
  ry: 38,
  rotateDeg: 3,
};

export const LEFT_EYE_CLIP: EyeSocket = {
  cx: 374,
  cy: 242,
  rx: 40,
  ry: 36,
  rotateDeg: -3,
};

export const RIGHT_EYE_CLIP: EyeSocket = {
  cx: 588,
  cy: 242,
  rx: 40,
  ry: 36,
  rotateDeg: 3,
};

export const LEFT_PUPIL: PupilMarkup = {
  cx: 374,
  cy: 242,
  rx: 34,
  ry: 31,
  catchlightPrimary: { cx: 366, cy: 236, r: 7, opacity: 0.9 },
  catchlightSecondary: { cx: 382, cy: 250, r: 3.5, opacity: 0.55 },
};

export const RIGHT_PUPIL: PupilMarkup = {
  cx: 588,
  cy: 242,
  rx: 34,
  ry: 31,
  catchlightPrimary: { cx: 580, cy: 236, r: 7, opacity: 0.9 },
  catchlightSecondary: { cx: 596, cy: 250, r: 3.5, opacity: 0.55 },
};

/** Light cyan U-smile so it reads on the dark visor. */
export const VISOR_SMILE = {
  d: 'M 448 282 Q 481 318 514 282',
  stroke: '#c8ffff',
  strokeWidth: 8,
  strokeLinecap: 'round' as const,
};

export type Point2D = {
  x: number;
  y: number;
};

export type LayoutBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function clampVectorToRadius(dx: number, dy: number, maxRadius: number): Point2D {
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.min(1, maxRadius / length);
  return { x: dx * scale, y: dy * scale };
}

export function pupilOffsetFromPointer(pointer: Point2D, eye: EyeCenter, maxRadius: number): Point2D {
  return clampVectorToRadius(pointer.x - eye.cx, pointer.y - eye.cy, maxRadius);
}

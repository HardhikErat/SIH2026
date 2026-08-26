/**
 * Tuned 900×1000 canvas geometry from the source-of-truth SVG.
 * Do not recalculate eye coordinates — they already match base-robot.png.
 */

export const ROBOT_CANVAS = {
  width: 900,
  height: 1000,
} as const;

export const MAX_PUPIL_TRAVEL = 20;

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

export const LEFT_EYE_SOCKET: EyeSocket = {
  cx: 423,
  cy: 285,
  rx: 75,
  ry: 63,
  rotateDeg: -3,
};

export const RIGHT_EYE_SOCKET: EyeSocket = {
  cx: 642,
  cy: 280,
  rx: 75,
  ry: 63,
  rotateDeg: 3,
};

export const LEFT_EYE_CLIP: EyeSocket = {
  cx: 423,
  cy: 285,
  rx: 72,
  ry: 60,
  rotateDeg: -3,
};

export const RIGHT_EYE_CLIP: EyeSocket = {
  cx: 642,
  cy: 280,
  rx: 72,
  ry: 60,
  rotateDeg: 3,
};

export const LEFT_PUPIL: PupilMarkup = {
  cx: 423,
  cy: 285,
  rx: 60,
  ry: 52,
  catchlightPrimary: { cx: 400, cy: 265, r: 14, opacity: 0.9 },
  catchlightSecondary: { cx: 445, cy: 305, r: 7, opacity: 0.7 },
};

export const RIGHT_PUPIL: PupilMarkup = {
  cx: 642,
  cy: 280,
  rx: 60,
  ry: 52,
  catchlightPrimary: { cx: 619, cy: 260, r: 14, opacity: 0.9 },
  catchlightSecondary: { cx: 664, cy: 300, r: 7, opacity: 0.7 },
};

export const MOUTH_PATH = 'M 505 325 Q 532.5 345 560 325';

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

export function layoutCenter(bounds: LayoutBounds): Point2D {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/** Map a pointer inside layout bounds into the 900×1000 SVG viewBox. */
export function pointerToSvg(
  locationX: number,
  locationY: number,
  bounds: Pick<LayoutBounds, 'width' | 'height'>,
): Point2D {
  const width = bounds.width || 1;
  const height = bounds.height || 1;
  return {
    x: (locationX / width) * ROBOT_CANVAS.width,
    y: (locationY / height) * ROBOT_CANVAS.height,
  };
}

/**
 * Clamp the vector from an eye center to the pointer so pupils stay
 * inside their clip-paths (max length = maxRadius, default 20).
 */
export function clampVectorToRadius(dx: number, dy: number, maxRadius: number): Point2D {
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.min(1, maxRadius / length);
  return { x: dx * scale, y: dy * scale };
}

export function pupilOffsetFromPointer(
  pointer: Point2D,
  eye: EyeCenter,
  maxRadius: number,
): Point2D {
  return clampVectorToRadius(pointer.x - eye.cx, pointer.y - eye.cy, maxRadius);
}

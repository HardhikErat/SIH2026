import { useEffect, useId, useRef, type CSSProperties } from 'react';
import {
  LEFT_EYE_CLIP,
  LEFT_PUPIL,
  MAX_PUPIL_TRAVEL,
  RIGHT_EYE_CLIP,
  RIGHT_PUPIL,
  ROBOT_CANVAS,
  VISOR_SMILE,
  clampVectorToRadius,
  type EyeCenter,
} from './robotEyesGeometry';

export type RobotEyesProps = {
  width?: number;
  maxPupilTravel?: number;
  trackingEnabled?: boolean;
  idPrefix?: string;
  accessibilityLabel?: string;
  testID?: string;
  style?: CSSProperties;
};

const ROBOT_SRC = require('../../assets/images/base-robot-prev.png') as string | number | { uri: string };

function assetUri(src: string | number | { uri: string }): string {
  if (typeof src === 'string') {
    return src;
  }
  if (typeof src === 'object' && src && 'uri' in src) {
    return src.uri;
  }
  return String(src);
}

function offsetFor(pointerX: number, pointerY: number, eye: EyeCenter, maxTravel: number) {
  return clampVectorToRadius(pointerX - eye.cx, pointerY - eye.cy, maxTravel);
}

export function RobotEyes({
  width,
  maxPupilTravel = MAX_PUPIL_TRAVEL,
  trackingEnabled = true,
  idPrefix,
  accessibilityLabel = 'Intake assistant robot with tracking eyes',
  testID = 'robot-eyes',
  style,
}: RobotEyesProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<SVGGElement>(null);
  const rightRef = useRef<SVGGElement>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ns = idPrefix ?? reactId;
  const ids = {
    leftEyeClip: `${ns}-left-eye-clip`,
    rightEyeClip: `${ns}-right-eye-clip`,
    eyeGlow: `${ns}-eye-glow`,
    leftPupil: `${ns}-leftPupil`,
    rightPupil: `${ns}-rightPupil`,
  };

  useEffect(() => {
    if (!trackingEnabled) {
      return undefined;
    }
    let frame = 0;
    const onMove = (event: MouseEvent) => {
      const host = hostRef.current;
      const left = leftRef.current;
      const right = rightRef.current;
      if (!host || !left || !right) {
        return;
      }
      const rect = host.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return;
      }
      const svgX = ((event.clientX - rect.left) / rect.width) * ROBOT_CANVAS.width;
      const svgY = ((event.clientY - rect.top) / rect.height) * ROBOT_CANVAS.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const l = offsetFor(svgX, svgY, LEFT_PUPIL, maxPupilTravel);
        const r = offsetFor(svgX, svgY, RIGHT_PUPIL, maxPupilTravel);
        left.setAttribute('transform', `translate(${l.x}, ${l.y})`);
        right.setAttribute('transform', `translate(${r.x}, ${r.y})`);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('mousemove', onMove);
    };
  }, [maxPupilTravel, trackingEnabled]);

  const hostStyle: CSSProperties = {
    position: 'relative',
    width: width ?? '100%',
    maxWidth: width ? undefined : 640,
    aspectRatio: `${ROBOT_CANVAS.width} / ${ROBOT_CANVAS.height}`,
    margin: '0 auto',
    userSelect: 'none',
    ...(style ?? {}),
  };

  return (
    <div ref={hostRef} data-testid={testID} role="img" aria-label={accessibilityLabel} style={hostStyle}>
      <img
        src={assetUri(ROBOT_SRC)}
        alt=""
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
      />
      <svg
        viewBox={`0 0 ${ROBOT_CANVAS.width} ${ROBOT_CANVAS.height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
      >
        <defs>
          <clipPath id={ids.leftEyeClip}>
            <ellipse
              cx={LEFT_EYE_CLIP.cx}
              cy={LEFT_EYE_CLIP.cy}
              rx={LEFT_EYE_CLIP.rx}
              ry={LEFT_EYE_CLIP.ry}
              transform={`rotate(${LEFT_EYE_CLIP.rotateDeg} ${LEFT_EYE_CLIP.cx} ${LEFT_EYE_CLIP.cy})`}
            />
          </clipPath>
          <clipPath id={ids.rightEyeClip}>
            <ellipse
              cx={RIGHT_EYE_CLIP.cx}
              cy={RIGHT_EYE_CLIP.cy}
              rx={RIGHT_EYE_CLIP.rx}
              ry={RIGHT_EYE_CLIP.ry}
              transform={`rotate(${RIGHT_EYE_CLIP.rotateDeg} ${RIGHT_EYE_CLIP.cx} ${RIGHT_EYE_CLIP.cy})`}
            />
          </clipPath>
          <radialGradient id={ids.eyeGlow} cx="42%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#e7ffff" />
            <stop offset="28%" stopColor="#5dfff8" />
            <stop offset="72%" stopColor="#00b4ff" />
            <stop offset="100%" stopColor="#004a99" />
          </radialGradient>
        </defs>

        <path
          d={VISOR_SMILE.d}
          fill="none"
          stroke={VISOR_SMILE.stroke}
          strokeWidth={VISOR_SMILE.strokeWidth}
          strokeLinecap={VISOR_SMILE.strokeLinecap}
        />

        <g clipPath={`url(#${ids.leftEyeClip})`}>
          <g ref={leftRef} id={ids.leftPupil}>
            <ellipse cx={LEFT_PUPIL.cx} cy={LEFT_PUPIL.cy} rx={LEFT_PUPIL.rx} ry={LEFT_PUPIL.ry} fill={`url(#${ids.eyeGlow})`} />
            <circle
              cx={LEFT_PUPIL.catchlightPrimary.cx}
              cy={LEFT_PUPIL.catchlightPrimary.cy}
              r={LEFT_PUPIL.catchlightPrimary.r}
              fill="#ffffff"
              opacity={LEFT_PUPIL.catchlightPrimary.opacity}
            />
            <circle
              cx={LEFT_PUPIL.catchlightSecondary.cx}
              cy={LEFT_PUPIL.catchlightSecondary.cy}
              r={LEFT_PUPIL.catchlightSecondary.r}
              fill="#ffffff"
              opacity={LEFT_PUPIL.catchlightSecondary.opacity}
            />
          </g>
        </g>

        <g clipPath={`url(#${ids.rightEyeClip})`}>
          <g ref={rightRef} id={ids.rightPupil}>
            <ellipse cx={RIGHT_PUPIL.cx} cy={RIGHT_PUPIL.cy} rx={RIGHT_PUPIL.rx} ry={RIGHT_PUPIL.ry} fill={`url(#${ids.eyeGlow})`} />
            <circle
              cx={RIGHT_PUPIL.catchlightPrimary.cx}
              cy={RIGHT_PUPIL.catchlightPrimary.cy}
              r={RIGHT_PUPIL.catchlightPrimary.r}
              fill="#ffffff"
              opacity={RIGHT_PUPIL.catchlightPrimary.opacity}
            />
            <circle
              cx={RIGHT_PUPIL.catchlightSecondary.cx}
              cy={RIGHT_PUPIL.catchlightSecondary.cy}
              r={RIGHT_PUPIL.catchlightSecondary.r}
              fill="#ffffff"
              opacity={RIGHT_PUPIL.catchlightSecondary.opacity}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

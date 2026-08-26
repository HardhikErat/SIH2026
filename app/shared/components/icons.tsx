import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

export type IconProps = {
  size?: number;
  color?: string;
};

function base(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24' } as const;
}

/** Clinical Intake brand mark — medical cross in a rounded square */
export function BrandMark({ size = 32 }: { size?: number }) {
  const r = Math.round(size * 0.28);
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={0} y={0} width={32} height={32} rx={r} fill={colors.navy800} />
      <Rect x={4} y={4} width={24} height={24} rx={Math.max(6, r - 2)} fill={colors.teal500} />
      <Path
        d="M15 9h2v5h5v2h-5v5h-2v-5H10v-2h5V9z"
        fill={colors.white}
      />
    </Svg>
  );
}

export function IconGlobe({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.75} />
      <Path
        d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconMic({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} strokeWidth={1.75} />
      <Path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9 20.5h6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconCheck({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.75} />
      <Path d="M7.5 12.2l2.8 2.8 6.2-6.2" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconDoctor({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Circle cx={12} cy={8} r={3.25} stroke={color} strokeWidth={1.75} />
      <Path
        d="M5.5 19.5c1.2-3.2 3.5-4.8 6.5-4.8s5.3 1.6 6.5 4.8"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Path d="M16.5 5.5h3.5v3.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18.25 5.5v5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function IconShield({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M12 3.5l7 2.5v5.2c0 4.3-2.9 7.8-7 9.3-4.1-1.5-7-5-7-9.3V6L12 3.5z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path d="M9.2 12.1l1.9 1.9 3.8-3.8" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSpeak({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M5 8.5h5.2L14.5 5v14L10.2 15.5H5V8.5z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <Path d="M17.5 9.5a3.2 3.2 0 0 1 0 5M19.5 7.5a5.5 5.5 0 0 1 0 9" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function IconBolt({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M13 3.5L7 13h5l-1 7.5L17 11h-5l1-7.5z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconClipboard({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x={6} y={5} width={12} height={15} rx={2} stroke={color} strokeWidth={1.75} />
      <Path d="M9 5.2V4.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4.5v.7" stroke={color} strokeWidth={1.75} />
      <Path d="M9 11h6M9 14.5h6" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function IconStethoscope({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M7 4v6.5a5 5 0 0 0 10 0V10"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Path d="M7 4h2.5M17 4h-2.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={19} cy={14} r={2.25} stroke={color} strokeWidth={1.75} />
      <Path d="M17 10.2V14" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function IconHospital({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M5 20.5V7.5L12 3.5l7 4v13" stroke={color} strokeWidth={1.75} strokeLinejoin="round" />
      <Path d="M10 20.5v-5h4v5M10.5 10h3M12 8.5v3" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function IconLock({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x={6} y={10.5} width={12} height={9.5} rx={2} stroke={color} strokeWidth={1.75} />
      <Path d="M9 10.5V8a3 3 0 0 1 6 0v2.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx={12} cy={15.25} r={1.1} fill={color} />
    </Svg>
  );
}

export function IconCheckSimple({ size = 24, color = colors.teal700 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M5 12.5l4.2 4.2L19 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconMicFilled({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} fill={color} />
      <Path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5M9 20.5h6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconArrowRight({ size = 24, color = colors.white }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

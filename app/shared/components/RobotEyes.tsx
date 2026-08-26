import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, type ReactElement, type ReactNode, type Ref } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  LEFT_EYE_CLIP,
  LEFT_EYE_SOCKET,
  LEFT_PUPIL,
  MAX_PUPIL_TRAVEL,
  MOUTH_PATH,
  RIGHT_EYE_CLIP,
  RIGHT_EYE_SOCKET,
  RIGHT_PUPIL,
  ROBOT_CANVAS,
  type EyeCenter,
  type LayoutBounds,
} from './robotEyesGeometry';

const ROBOT_ASSET = require('../../assets/images/base-robot.png') as number;

const AnimatedG = Animated.createAnimatedComponent(G);

const PUPIL_TIMING = {
  duration: 60,
  easing: Easing.out(Easing.ease),
} as const;

export type RobotEyesProps = {
  /** Optional width; height follows the 900×1000 canvas aspect ratio. */
  width?: number;
  /** Max pupil translation in SVG units. Source SVG is tuned for 20. */
  maxPupilTravel?: number;
  /** When false, pupils stay centered (clip + gradient still render). */
  trackingEnabled?: boolean;
  /** Prefix SVG ids so multiple instances do not collide. */
  idPrefix?: string;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

export type RobotEyesHandle = {
  resetPupils: () => void;
};

type PointerLocationEvent = NativeSyntheticEvent<{
  locationX: number;
  locationY: number;
}>;

type PupilTranslate = {
  translateX: number;
  translateY: number;
};

type AnimatedPupilGProps = {
  id: string;
  animatedProps: object;
  style: object;
  children: ReactNode;
};

const AnimatedPupilG = AnimatedG as unknown as (props: AnimatedPupilGProps) => ReactElement;

function pupilTranslate(
  localX: number,
  localY: number,
  layoutW: number,
  layoutH: number,
  eye: EyeCenter,
  maxRadius: number,
  active: number,
): PupilTranslate {
  'worklet';
  const w = layoutW || 1;
  const h = layoutH || 1;
  const svgX = (localX / w) * ROBOT_CANVAS.width;
  const svgY = (localY / h) * ROBOT_CANVAS.height;
  const dx = svgX - eye.cx;
  const dy = svgY - eye.cy;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) {
    return { translateX: 0, translateY: 0 };
  }
  const scale = Math.min(1, maxRadius / length) * active;
  return { translateX: dx * scale, translateY: dy * scale };
}

function RobotEyesInner(
  {
    width,
    maxPupilTravel = MAX_PUPIL_TRAVEL,
    trackingEnabled = true,
    idPrefix,
    accessibilityLabel = 'Intake assistant robot with tracking eyes',
    testID = 'robot-eyes',
    style,
  }: RobotEyesProps,
  ref: Ref<RobotEyesHandle>,
) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ns = idPrefix ?? reactId;

  const ids = useMemo(
    () => ({
      leftEyeClip: `${ns}-left-eye-clip`,
      rightEyeClip: `${ns}-right-eye-clip`,
      eyeGlow: `${ns}-eye-glow`,
      leftPupil: `${ns}-leftPupil`,
      rightPupil: `${ns}-rightPupil`,
    }),
    [ns],
  );

  const layoutWidth = useSharedValue(1);
  const layoutHeight = useSharedValue(1);
  const pointerLocalX = useSharedValue(0);
  const pointerLocalY = useSharedValue(0);
  const tracking = useSharedValue(0);
  const maxTravel = useSharedValue(maxPupilTravel);

  useEffect(() => {
    maxTravel.value = maxPupilTravel;
  }, [maxPupilTravel, maxTravel]);

  const resetPupils = useCallback(() => {
    tracking.value = withTiming(0, PUPIL_TIMING);
  }, [tracking]);

  useImperativeHandle(ref, () => ({ resetPupils }), [resetPupils]);

  const mapAndTrack = useCallback(
    (locationX: number, locationY: number) => {
      if (!trackingEnabled) {
        return;
      }
      pointerLocalX.value = locationX;
      pointerLocalY.value = locationY;
      tracking.value = 1;
    },
    [pointerLocalX, pointerLocalY, tracking, trackingEnabled],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const next: LayoutBounds = event.nativeEvent.layout;
      layoutWidth.value = Math.max(next.width, 1);
      layoutHeight.value = Math.max(next.height, 1);
    },
    [layoutHeight, layoutWidth],
  );

  const onResponderMove = useCallback(
    (event: GestureResponderEvent) => {
      mapAndTrack(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    [mapAndTrack],
  );

  const onPointerMove = useCallback(
    (event: PointerLocationEvent) => {
      mapAndTrack(event.nativeEvent.locationX, event.nativeEvent.locationY);
    },
    [mapAndTrack],
  );

  const leftPupilStyle = useAnimatedStyle(() => {
    const t = pupilTranslate(
      pointerLocalX.value,
      pointerLocalY.value,
      layoutWidth.value,
      layoutHeight.value,
      LEFT_PUPIL,
      maxTravel.value,
      tracking.value,
    );
    return {
      transform: [{ translateX: t.translateX }, { translateY: t.translateY }],
    };
  });

  const rightPupilStyle = useAnimatedStyle(() => {
    const t = pupilTranslate(
      pointerLocalX.value,
      pointerLocalY.value,
      layoutWidth.value,
      layoutHeight.value,
      RIGHT_PUPIL,
      maxTravel.value,
      tracking.value,
    );
    return {
      transform: [{ translateX: t.translateX }, { translateY: t.translateY }],
    };
  });

  const leftPupilProps = useAnimatedProps(() => {
    const t = pupilTranslate(
      pointerLocalX.value,
      pointerLocalY.value,
      layoutWidth.value,
      layoutHeight.value,
      LEFT_PUPIL,
      maxTravel.value,
      tracking.value,
    );
    return {
      transform: [{ translateX: t.translateX }, { translateY: t.translateY }],
    };
  });

  const rightPupilProps = useAnimatedProps(() => {
    const t = pupilTranslate(
      pointerLocalX.value,
      pointerLocalY.value,
      layoutWidth.value,
      layoutHeight.value,
      RIGHT_PUPIL,
      maxTravel.value,
      tracking.value,
    );
    return {
      transform: [{ translateX: t.translateX }, { translateY: t.translateY }],
    };
  });

  const webPointerProps = {
    onPointerMove,
    onPointerDown: onPointerMove,
    onPointerLeave: resetPupils,
    onMouseMove: onPointerMove,
    onMouseLeave: resetPupils,
  };

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      onStartShouldSetResponder={() => trackingEnabled}
      onMoveShouldSetResponder={() => trackingEnabled}
      onResponderGrant={onResponderMove}
      onResponderMove={onResponderMove}
      onResponderRelease={resetPupils}
      onResponderTerminate={resetPupils}
      {...(webPointerProps as object)}
      style={[styles.host, width != null ? { width, aspectRatio: ROBOT_CANVAS.width / ROBOT_CANVAS.height } : styles.flexHost, style]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${ROBOT_CANVAS.width} ${ROBOT_CANVAS.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <ClipPath id={ids.leftEyeClip}>
            <Ellipse
              cx={LEFT_EYE_CLIP.cx}
              cy={LEFT_EYE_CLIP.cy}
              rx={LEFT_EYE_CLIP.rx}
              ry={LEFT_EYE_CLIP.ry}
              transform={`rotate(${LEFT_EYE_CLIP.rotateDeg}, ${LEFT_EYE_CLIP.cx}, ${LEFT_EYE_CLIP.cy})`}
            />
          </ClipPath>
          <ClipPath id={ids.rightEyeClip}>
            <Ellipse
              cx={RIGHT_EYE_CLIP.cx}
              cy={RIGHT_EYE_CLIP.cy}
              rx={RIGHT_EYE_CLIP.rx}
              ry={RIGHT_EYE_CLIP.ry}
              transform={`rotate(${RIGHT_EYE_CLIP.rotateDeg}, ${RIGHT_EYE_CLIP.cx}, ${RIGHT_EYE_CLIP.cy})`}
            />
          </ClipPath>
          <RadialGradient id={ids.eyeGlow} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#00f0ff" />
            <Stop offset="70%" stopColor="#0066cc" />
            <Stop offset="100%" stopColor="#001a4d" />
          </RadialGradient>
        </Defs>

        <Image href={ROBOT_ASSET} x={0} y={0} width={ROBOT_CANVAS.width} height={ROBOT_CANVAS.height} />

        <Ellipse
          cx={LEFT_EYE_SOCKET.cx}
          cy={LEFT_EYE_SOCKET.cy}
          rx={LEFT_EYE_SOCKET.rx}
          ry={LEFT_EYE_SOCKET.ry}
          fill="#0c1a30"
          transform={`rotate(${LEFT_EYE_SOCKET.rotateDeg}, ${LEFT_EYE_SOCKET.cx}, ${LEFT_EYE_SOCKET.cy})`}
        />
        <Ellipse
          cx={RIGHT_EYE_SOCKET.cx}
          cy={RIGHT_EYE_SOCKET.cy}
          rx={RIGHT_EYE_SOCKET.rx}
          ry={RIGHT_EYE_SOCKET.ry}
          fill="#0c1a30"
          transform={`rotate(${RIGHT_EYE_SOCKET.rotateDeg}, ${RIGHT_EYE_SOCKET.cx}, ${RIGHT_EYE_SOCKET.cy})`}
        />

        <G clipPath={`url(#${ids.leftEyeClip})`}>
          <AnimatedPupilG id={ids.leftPupil} style={leftPupilStyle} animatedProps={leftPupilProps}>
            <Ellipse cx={LEFT_PUPIL.cx} cy={LEFT_PUPIL.cy} rx={LEFT_PUPIL.rx} ry={LEFT_PUPIL.ry} fill={`url(#${ids.eyeGlow})`} />
            <Circle
              cx={LEFT_PUPIL.catchlightPrimary.cx}
              cy={LEFT_PUPIL.catchlightPrimary.cy}
              r={LEFT_PUPIL.catchlightPrimary.r}
              fill="#ffffff"
              opacity={LEFT_PUPIL.catchlightPrimary.opacity}
            />
            <Circle
              cx={LEFT_PUPIL.catchlightSecondary.cx}
              cy={LEFT_PUPIL.catchlightSecondary.cy}
              r={LEFT_PUPIL.catchlightSecondary.r}
              fill="#ffffff"
              opacity={LEFT_PUPIL.catchlightSecondary.opacity}
            />
          </AnimatedPupilG>
        </G>

        <G clipPath={`url(#${ids.rightEyeClip})`}>
          <AnimatedPupilG id={ids.rightPupil} style={rightPupilStyle} animatedProps={rightPupilProps}>
            <Ellipse cx={RIGHT_PUPIL.cx} cy={RIGHT_PUPIL.cy} rx={RIGHT_PUPIL.rx} ry={RIGHT_PUPIL.ry} fill={`url(#${ids.eyeGlow})`} />
            <Circle
              cx={RIGHT_PUPIL.catchlightPrimary.cx}
              cy={RIGHT_PUPIL.catchlightPrimary.cy}
              r={RIGHT_PUPIL.catchlightPrimary.r}
              fill="#ffffff"
              opacity={RIGHT_PUPIL.catchlightPrimary.opacity}
            />
            <Circle
              cx={RIGHT_PUPIL.catchlightSecondary.cx}
              cy={RIGHT_PUPIL.catchlightSecondary.cy}
              r={RIGHT_PUPIL.catchlightSecondary.r}
              fill="#ffffff"
              opacity={RIGHT_PUPIL.catchlightSecondary.opacity}
            />
          </AnimatedPupilG>
        </G>

        <Path
          d={MOUTH_PATH}
          fill="none"
          stroke="#00f0ff"
          strokeWidth={14}
          strokeLinecap="round"
          opacity={0.35}
        />
        <Path d={MOUTH_PATH} fill="none" stroke="#00f0ff" strokeWidth={7} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

export const RobotEyes = forwardRef<RobotEyesHandle, RobotEyesProps>(RobotEyesInner);
RobotEyes.displayName = 'RobotEyes';

const styles = StyleSheet.create({
  host: {
    alignSelf: 'center',
    overflow: 'hidden',
  },
  flexHost: {
    width: '100%',
    aspectRatio: ROBOT_CANVAS.width / ROBOT_CANVAS.height,
  },
});

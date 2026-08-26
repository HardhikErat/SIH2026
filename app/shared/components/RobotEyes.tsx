import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, type Ref } from 'react';
import {
  Image as RasterImage,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  type EyeSocket,
  type LayoutBounds,
  type PupilMarkup,
} from './robotEyesGeometry';

const ROBOT_ASSET = require('../../assets/images/base-robot.png') as number;

const PUPIL_TIMING = {
  duration: 60,
  easing: Easing.out(Easing.ease),
} as const;

export type RobotEyesProps = {
  width?: number;
  maxPupilTravel?: number;
  trackingEnabled?: boolean;
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

function pupilTranslate(
  localX: number,
  localY: number,
  layoutW: number,
  layoutH: number,
  eye: EyeCenter,
  maxRadius: number,
  active: number,
): { translateX: number; translateY: number } {
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

function PupilGraphic({ pupil, glowId }: { pupil: PupilMarkup; glowId: string }) {
  return (
    <>
      <Ellipse cx={pupil.cx} cy={pupil.cy} rx={pupil.rx} ry={pupil.ry} fill={`url(#${glowId})`} />
      <Circle
        cx={pupil.catchlightPrimary.cx}
        cy={pupil.catchlightPrimary.cy}
        r={pupil.catchlightPrimary.r}
        fill="#ffffff"
        opacity={pupil.catchlightPrimary.opacity}
      />
      <Circle
        cx={pupil.catchlightSecondary.cx}
        cy={pupil.catchlightSecondary.cy}
        r={pupil.catchlightSecondary.r}
        fill="#ffffff"
        opacity={pupil.catchlightSecondary.opacity}
      />
    </>
  );
}

function AnimatedPupil({
  clip,
  pupil,
  glowId,
  clipId,
  groupId,
  style,
}: {
  clip: EyeSocket;
  pupil: PupilMarkup;
  glowId: string;
  clipId: string;
  groupId: string;
  style: object;
}) {
  const box: ViewStyle = {
    position: 'absolute',
    left: `${((clip.cx - clip.rx) / ROBOT_CANVAS.width) * 100}%`,
    top: `${((clip.cy - clip.ry) / ROBOT_CANVAS.height) * 100}%`,
    width: `${((clip.rx * 2) / ROBOT_CANVAS.width) * 100}%`,
    height: `${((clip.ry * 2) / ROBOT_CANVAS.height) * 100}%`,
    overflow: 'hidden',
    borderRadius: 999,
    transform: [{ rotate: `${clip.rotateDeg}deg` }],
  };
  const originX = clip.cx - clip.rx;
  const originY = clip.cy - clip.ry;

  return (
    <View pointerEvents="none" style={[box, { pointerEvents: 'none' }]}>
      <Animated.View style={style}>
        <Svg width="100%" height="100%" viewBox={`${originX} ${originY} ${clip.rx * 2} ${clip.ry * 2}`}>
          <Defs>
            <ClipPath id={clipId}>
              <Ellipse
                cx={clip.cx}
                cy={clip.cy}
                rx={clip.rx}
                ry={clip.ry}
                transform={`rotate(${clip.rotateDeg}, ${clip.cx}, ${clip.cy})`}
              />
            </ClipPath>
            <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#00f0ff" />
              <Stop offset="70%" stopColor="#0066cc" />
              <Stop offset="100%" stopColor="#001a4d" />
            </RadialGradient>
          </Defs>
          <G id={groupId} clipPath={`url(#${clipId})`}>
            <PupilGraphic pupil={pupil} glowId={glowId} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
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
  const pointerLocalX = useSharedValue(ROBOT_CANVAS.width / 2);
  const pointerLocalY = useSharedValue(ROBOT_CANVAS.height / 2);
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
    const sx = layoutWidth.value / ROBOT_CANVAS.width;
    const sy = layoutHeight.value / ROBOT_CANVAS.height;
    return {
      width: '100%' as const,
      height: '100%' as const,
      transform: [{ translateX: t.translateX * sx }, { translateY: t.translateY * sy }],
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
    const sx = layoutWidth.value / ROBOT_CANVAS.width;
    const sy = layoutHeight.value / ROBOT_CANVAS.height;
    return {
      width: '100%' as const,
      height: '100%' as const,
      transform: [{ translateX: t.translateX * sx }, { translateY: t.translateY * sy }],
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
      style={[styles.host, width != null ? { width } : styles.flexHost, style]}
    >
      <RasterImage source={ROBOT_ASSET} style={styles.baseImage} resizeMode="contain" />

      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox={`0 0 ${ROBOT_CANVAS.width} ${ROBOT_CANVAS.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
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
        <Path d={MOUTH_PATH} fill="none" stroke="#00f0ff" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
        <Path d={MOUTH_PATH} fill="none" stroke="#00f0ff" strokeWidth={7} strokeLinecap="round" />
      </Svg>

      <AnimatedPupil
        clip={LEFT_EYE_CLIP}
        pupil={LEFT_PUPIL}
        glowId={`${ids.eyeGlow}-left`}
        clipId={ids.leftEyeClip}
        groupId={ids.leftPupil}
        style={leftPupilStyle}
      />
      <AnimatedPupil
        clip={RIGHT_EYE_CLIP}
        pupil={RIGHT_PUPIL}
        glowId={`${ids.eyeGlow}-right`}
        clipId={ids.rightEyeClip}
        groupId={ids.rightPupil}
        style={rightPupilStyle}
      />
    </View>
  );
}

export const RobotEyes = forwardRef<RobotEyesHandle, RobotEyesProps>(RobotEyesInner);
RobotEyes.displayName = 'RobotEyes';

const styles = StyleSheet.create({
  host: {
    alignSelf: 'center',
    overflow: 'hidden',
    aspectRatio: ROBOT_CANVAS.width / ROBOT_CANVAS.height,
    backgroundColor: 'transparent',
  },
  flexHost: {
    width: '100%',
    maxWidth: 520,
  },
  baseImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});

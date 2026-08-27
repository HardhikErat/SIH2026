import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, type Ref } from 'react';
import {
  Image as RasterImage,
  Platform,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';
import {
  LEFT_EYE_CLIP,
  LEFT_PUPIL,
  MAX_PUPIL_TRAVEL,
  RIGHT_EYE_CLIP,
  RIGHT_PUPIL,
  ROBOT_CANVAS,
  VISOR_SMILE,
  type EyeCenter,
  type EyeSocket,
  type LayoutBounds,
  type PupilMarkup,
} from './robotEyesGeometry';

const ROBOT_ASSET = require('../../assets/images/base-robot-prev.png') as number;

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

function pupilLayerStyle(
  localX: number,
  localY: number,
  layoutW: number,
  layoutH: number,
  eye: EyeCenter,
  maxRadius: number,
  active: number,
) {
  'worklet';
  const t = pupilTranslate(localX, localY, layoutW, layoutH, eye, maxRadius, active);
  const x = t.translateX * (layoutW / ROBOT_CANVAS.width);
  const y = t.translateY * (layoutH / ROBOT_CANVAS.height);
  if (Platform.OS === 'web') {
    return {
      width: '100%' as const,
      height: '100%' as const,
      transform: `translate(${x}px, ${y}px)`,
    };
  }
  return {
    width: '100%' as const,
    height: '100%' as const,
    transform: [{ translateX: x }, { translateY: y }],
  };
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
            <RadialGradient id={glowId} cx="42%" cy="38%" r="62%">
              <Stop offset="0%" stopColor="#e7ffff" />
              <Stop offset="28%" stopColor="#5dfff8" />
              <Stop offset="72%" stopColor="#00b4ff" />
              <Stop offset="100%" stopColor="#004a99" />
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
    accessibilityLabel = 'Aira — intake assistant with tracking eyes',
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

  const leftPupilStyle = useAnimatedStyle(() =>
    pupilLayerStyle(
      pointerLocalX.value,
      pointerLocalY.value,
      layoutWidth.value,
      layoutHeight.value,
      LEFT_PUPIL,
      maxTravel.value,
      tracking.value,
    ),
  );

  const rightPupilStyle = useAnimatedStyle(() =>
    pupilLayerStyle(
      pointerLocalX.value,
      pointerLocalY.value,
      layoutWidth.value,
      layoutHeight.value,
      RIGHT_PUPIL,
      maxTravel.value,
      tracking.value,
    ),
  );

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

      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox={`0 0 ${ROBOT_CANVAS.width} ${ROBOT_CANVAS.height}`}>
        <Path
          d={VISOR_SMILE.d}
          fill="none"
          stroke={VISOR_SMILE.stroke}
          strokeWidth={VISOR_SMILE.strokeWidth}
          strokeLinecap={VISOR_SMILE.strokeLinecap}
        />
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
    maxWidth: 640,
  },
  baseImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});

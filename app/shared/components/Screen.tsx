import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { MotionView } from '../motion/MotionView';
import { fadeInUp } from '../motion/presets';
import { useMotionTransition } from '../motion/useMotionTransition';
import { colors, layout, space } from '../theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  wide?: boolean;
  doctor?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({ children, scroll = true, wide, doctor, style, contentStyle }: Props) {
  const maxWidth = doctor ? layout.doctorMax : wide ? layout.landingMax : layout.patientMax;
  const transition = useMotionTransition();

  const inner = (
    <MotionView
      style={[styles.inner, { maxWidth }, contentStyle]}
      initial={fadeInUp.initial}
      animate={fadeInUp.animate}
      transition={transition}
    >
      {children}
    </MotionView>
  );

  if (!scroll) {
    return (
      <View style={[styles.root, styles.static, style]}>
        {inner}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, style]}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      {inner}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.sand100,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    alignItems: 'center',
  },
  static: {
    flex: undefined,
    minHeight: '100%',
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    alignItems: 'center',
    // @ts-ignore - web only
    overflowY: 'auto',
  },
  inner: {
    width: '100%',
    gap: space[5],
  },
});

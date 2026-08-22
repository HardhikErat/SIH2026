import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
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
  const maxWidth = doctor ? layout.doctorMax : wide ? layout.landingMax : layout.contentMax;
  const inner = (
    <View style={[styles.inner, { maxWidth }, contentStyle]}>{children}</View>
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
    backgroundColor: colors.surface,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    alignItems: 'center',
  },
  static: {
    paddingHorizontal: space[5],
    paddingVertical: space[6],
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    gap: space[5],
  },
});

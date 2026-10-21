import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HeaderTextButton} from '../../components/HeaderTextButton';
import {ModalVideoPlayer} from '../../components/ModalVideoPlayer';
import {colors, spacing} from '../../theme';
import {useProjectPlayerScreenController} from './useProjectPlayerScreenController';

/** View: an exported project, full screen with native controls. Close · title · Delete. */
export function ProjectPlayerScreen() {
  const c = useProjectPlayerScreenController();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      <View style={styles.header}>
        {/* Equal-width sides keep the title centred. */}
        <View style={styles.headerSide}>
          <HeaderTextButton label="Close" onPress={c.onClose} />
        </View>
        <Text style={styles.title}>{c.title}</Text>
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <HeaderTextButton label="Delete" color={colors.danger} onPress={c.onDelete} />
        </View>
      </View>
      {c.uri ? <ModalVideoPlayer uri={c.uri} style={styles.player} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerSide: {flex: 1, alignItems: 'flex-start'},
  headerSideEnd: {alignItems: 'flex-end'},
  title: {color: colors.text, fontSize: 15, fontWeight: '600'},
  // Fill the rest of the screen; the video letterboxes inside (contentFit "contain").
  player: {flex: 1, aspectRatio: undefined, borderRadius: 0},
});

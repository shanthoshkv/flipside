import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../data';
import { tr } from '../i18n';
import { radius, space, useTheme } from '../theme';
import { useUndo } from '../undo';
import { Txt, tap } from './ui';

export function UndoBar() {
  const t = useTheme(), { bottom } = useSafeAreaInsets(), msg = useUndo((s) => s.msg);
  if (!msg) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: space(4), right: space(4), bottom: bottom + 80, borderRadius: radius.md, backgroundColor: t.text, flexDirection: 'row', alignItems: 'center', paddingLeft: space(4) }}>
      <Txt raw c={t.bg} style={{ flex: 1 }}>{tr(msg)}</Txt>
      <Pressable accessibilityRole="button" onPress={async () => { tap(); await useUndo.getState().run(); await useData.getState().reload(); }} style={{ minHeight: 48, paddingHorizontal: space(4), justifyContent: 'center' }}>
        <Txt v="h3" raw c={t.bg}>{tr('Undo')}</Txt>
      </Pressable>
    </View>
  );
}

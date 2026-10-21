import { Pressable, ScrollView } from 'react-native';
import { playAmbient, previewAmbient, SOUND_KEYS, SOUNDS, type Sound } from '../engine/ambient';
import { useFlip } from '../engine/flip';
import { useSettings } from '../store';
import { radius, space, useTheme } from '../theme';
import { Txt, tap } from './ui';

/** Chips for the focus sound. Picking previews 4 s (or switches live mid-session). */
export function AmbientPicker({ layer = 0 }: { layer?: 0 | 1 }) {
  const t = useTheme();
  const key = layer ? 'ambient2' : 'ambient', vkey = layer ? 'ambient2Volume' : 'ambientVolume';
  const ambient = useSettings((s) => s[key]);
  const pick = (s: Sound) => {
    tap();
    const vol = useSettings.getState()[vkey], f = useFlip.getState();
    useSettings.getState().set(key, s);
    if (f.status === 'RUNNING' && f.phase === 'focus') playAmbient(s, vol, layer);
    else previewAmbient(s, vol, layer);
  };
  const opts: { v: Sound; label: string }[] = [{ v: 'off', label: 'Off' }, ...SOUND_KEYS.map((k) => ({ v: k as Sound, label: SOUNDS[k].label }))];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
      {opts.map((o) => {
        const on = o.v === ambient;
        return (
          <Pressable key={o.v} accessibilityRole="button" accessibilityLabel={`Sound ${o.label}`} accessibilityState={{ selected: on }} onPress={() => pick(o.v)}
            style={{ minHeight: 44, paddingHorizontal: space(4), borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? t.accentA : t.surface2 }}>
            <Txt v="h3" c={on ? '#1A1206' : t.text}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

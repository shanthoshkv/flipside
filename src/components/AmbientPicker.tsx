import { Pressable, ScrollView } from 'react-native';
import { playAmbient, previewAmbient, SOUND_KEYS, SOUNDS, type Sound } from '../engine/ambient';
import { useFlip } from '../engine/flip';
import { useSettings } from '../store';
import { radius, space, useTheme } from '../theme';
import { Txt, tap } from './ui';

/** Chips for the focus sound. Picking previews 4 s (or switches live mid-session). */
export function AmbientPicker() {
  const t = useTheme();
  const ambient = useSettings((s) => s.ambient);
  const pick = (s: Sound) => {
    tap();
    const { ambientVolume } = useSettings.getState(), f = useFlip.getState();
    useSettings.getState().set('ambient', s);
    if (f.status === 'RUNNING' && f.phase === 'focus') playAmbient(s, ambientVolume);
    else previewAmbient(s, ambientVolume);
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

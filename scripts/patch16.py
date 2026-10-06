import re, sys

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, '::', a[:100]); sys.exit(1)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

p = 'src/components/charts.tsx'
s = open(p, encoding='utf-8').read()

# BarChart: touch handled by plain RN Pressables over the SVG, not SVG onPress (a native-crash suspect on Android)
a = s.index("  return (\n    <View onLayout={onLayout} accessible accessibilityRole=\"image\" accessibilityLabel={unit")
b = s.index("export function HourChart")
s = s[:a] + '''  return (
    <View onLayout={onLayout}>
      <View accessible={!onSelect} accessibilityRole={onSelect ? undefined : 'image'} accessibilityLabel={onSelect ? undefined : unit ? `Chart: ${summary}` : `Focus per day: ${summary}`}>
        <Svg width={w} height={height}>
          {goal ? <Rect x={0} y={plot - (goal / max) * plot} width={w} height={1} fill={t.muted} opacity={0.35} /> : null}
          {data.map((d, i) => (
            <Bar key={i} i={i} p={p} x={i * bw + bw * 0.18} w={bw * 0.64} base={plot}
              h={Math.max(d.ms > 0 ? 4 : 2, (d.ms / max) * plot)} fill={d.ms === 0 ? t.surface2 : d.hot ? t.accentB : t.accentA} />
          ))}
          {data.map((d, i) => (
            <SText key={`l${i}`} x={i * bw + bw / 2} y={height - 4} fontSize={11} fontFamily={font.body} fill={t.muted} textAnchor="middle">{d.label}</SText>
          ))}
        </Svg>
      </View>
      {onSelect && (
        <View style={{ position: 'absolute', left: 0, top: 0, width: w, height, flexDirection: 'row' }}>
          {data.map((d, i) => (
            <Pressable key={i} style={{ flex: 1 }} accessibilityRole="button"
              accessibilityLabel={unit ? `${d.label}: ${d.ms} ${unit}` : `${d.label}: ${Math.round(d.ms / 60000)} minutes. Open day`} onPress={() => onSelect(i)} />
          ))}
        </View>
      )}
    </View>
  );
}

''' + s[b:]

# Heatmap: one Pressable over the grid, cell worked out from the touch position
a = s.index("  return (\n    <View onLayout={onLayout}>\n      <Animated.View style={fade}>")
s = s[:a] + '''  const pick = (x: number, y: number) => {
    const d = all[Math.floor(x / cell) * 7 + Math.floor(y / cell)];
    if (d && onSelect) onSelect(d.key);
  };
  return (
    <View onLayout={onLayout}>
      <Pressable disabled={!onSelect} accessibilityRole="image" accessibilityLabel="Focus heatmap of the last 15 weeks. Use Open any day to read a specific day."
        onPress={(e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
        <Animated.View style={fade}>
          <Svg width={w} height={cell * 7}>
            {all.map((d, i) => d && (
              <Rect key={i} x={Math.floor(i / 7) * cell + 1.5} y={(i % 7) * cell + 1.5} width={cell - 3} height={cell - 3} rx={cell * 0.28}
                fill={d.ms > 0 ? t.accentA : t.surface2} opacity={d.ms > 0 ? 0.25 + Math.ceil((d.ms / max) * 4) * 0.19 : 1} />
            ))}
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  );
}
'''
s = s.replace("import { View } from 'react-native';", "import { Pressable, View } from 'react-native';", 1)
open(p, 'w', encoding='utf-8').write(s)

# ambient: no stale async start, real stop
open('src/engine/ambient.ts', 'w', encoding='utf-8').write('''import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Real field recordings, trimmed and looped (see CREDITS.md). No network.
export const SOUNDS = {
  rain: { label: 'Rain', src: require('../../assets/sounds/rain.ogg') },
  downpour: { label: 'Downpour', src: require('../../assets/sounds/downpour.ogg') },
  ocean: { label: 'Ocean', src: require('../../assets/sounds/ocean.ogg') },
  stream: { label: 'Stream', src: require('../../assets/sounds/stream.ogg') },
  forest: { label: 'Forest', src: require('../../assets/sounds/forest.ogg') },
  fire: { label: 'Campfire', src: require('../../assets/sounds/fire.ogg') },
  hum: { label: 'Fan', src: require('../../assets/sounds/hum.ogg') },
  white: { label: 'White noise', src: require('../../assets/sounds/white.ogg') },
} as const;
export type Sound = 'off' | keyof typeof SOUNDS;
export const SOUND_KEYS = Object.keys(SOUNDS) as (keyof typeof SOUNDS)[];

let player: AudioPlayer | null = null;
let current: Sound = 'off';
let preview: ReturnType<typeof setTimeout> | null = null;
let gen = 0; // bumped on every start/stop so a slow earlier start can never revive itself

export function stopAmbient() {
  gen++;
  if (preview) clearTimeout(preview);
  preview = null;
  const p = player;
  player = null;
  current = 'off';
  if (p) {
    try { p.pause(); } catch { /* already released */ }
    try { p.remove(); } catch { /* already released */ }
  }
}

/** volume is a percentage, 0-100. Mixes with other audio so music keeps playing. */
export async function playAmbient(s: Sound, volume: number) {
  if (s === 'off') return stopAmbient();
  if (preview) { clearTimeout(preview); preview = null; }
  if (player && current === s) { player.volume = volume / 100; player.play(); return; }
  stopAmbient();
  const mine = gen;
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  if (mine !== gen) return; // something newer (another sound, or Off) happened while we waited
  const p = createAudioPlayer(SOUNDS[s].src);
  p.loop = true;
  p.volume = volume / 100;
  player = p;
  current = s;
  p.play();
}

export const setAmbientVolume = (v: number) => { if (player) player.volume = v / 100; };
export const pauseAmbient = () => player?.pause();

export function previewAmbient(s: Sound, volume: number) {
  playAmbient(s, volume);
  if (s !== 'off') preview = setTimeout(stopAmbient, 4000);
}
''')

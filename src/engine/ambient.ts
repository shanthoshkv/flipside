import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Real field recordings, trimmed and looped (see CREDITS.md). No network.
export const SOUNDS = {
  rain: { label: 'Rain', src: require('../../assets/sounds/rain.ogg') },
  downpour: { label: 'Showers', src: require('../../assets/sounds/downpour.ogg') },
  ocean: { label: 'Ocean', src: require('../../assets/sounds/ocean.ogg') },
  stream: { label: 'Stream', src: require('../../assets/sounds/stream.ogg') },
  forest: { label: 'Forest', src: require('../../assets/sounds/forest.ogg') },
  fire: { label: 'Campfire', src: require('../../assets/sounds/fire.ogg') },
  hum: { label: 'Fan', src: require('../../assets/sounds/hum.ogg') },
  white: { label: 'White noise', src: require('../../assets/sounds/white.ogg') },
} as const;
export type Sound = 'off' | keyof typeof SOUNDS;
export const SOUND_KEYS = Object.keys(SOUNDS) as (keyof typeof SOUNDS)[];

/** Two independent layers (e.g. rain + fire). Layer 0 is the main sound. */
const L = [0, 1].map(() => ({ player: null as AudioPlayer | null, current: 'off' as Sound, gen: 0 })); // gen bumps on every start/stop so a slow earlier start can never revive itself
let preview: ReturnType<typeof setTimeout> | null = null;

function stopLayer(i: number) {
  const l = L[i];
  l.gen++;
  const p = l.player;
  l.player = null; l.current = 'off';
  if (p) {
    try { p.pause(); } catch { /* already released */ }
    try { p.remove(); } catch { /* already released */ }
  }
}
export function stopAmbient() {
  if (preview) clearTimeout(preview);
  preview = null;
  L.forEach((_, i) => stopLayer(i));
}

/** volume is a percentage, 0-100. Mixes with other audio so music keeps playing. */
export async function playAmbient(s: Sound, volume: number, layer = 0) {
  const l = L[layer];
  if (s === 'off') return stopLayer(layer);
  if (preview) { clearTimeout(preview); preview = null; }
  if (l.player && l.current === s) { l.player.volume = volume / 100; l.player.play(); return; }
  stopLayer(layer);
  const mine = l.gen;
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  if (mine !== l.gen) return; // something newer (another sound, or Off) happened while we waited
  const p = createAudioPlayer(SOUNDS[s].src);
  p.loop = true;
  p.volume = volume / 100;
  l.player = p;
  l.current = s;
  p.play();
}

export const setAmbientVolume = (v: number, layer = 0) => { const p = L[layer].player; if (p) p.volume = v / 100; };
export const pauseAmbient = () => L.forEach((l) => l.player?.pause());

export function previewAmbient(s: Sound, volume: number, layer = 0) {
  playAmbient(s, volume, layer);
  if (s !== 'off') preview = setTimeout(stopAmbient, 4000);
}

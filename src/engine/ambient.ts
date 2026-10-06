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

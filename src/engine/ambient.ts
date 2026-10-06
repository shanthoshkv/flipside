import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Generated, bundled, loop-safe noise beds. No network.
export const SOUNDS = {
  rain: { label: 'Rain', src: require('../../assets/sounds/rain.wav') },
  ocean: { label: 'Ocean', src: require('../../assets/sounds/ocean.wav') },
  fan: { label: 'Fan', src: require('../../assets/sounds/fan.wav') },
  brown: { label: 'Brown', src: require('../../assets/sounds/brown.wav') },
  pink: { label: 'Pink', src: require('../../assets/sounds/pink.wav') },
  white: { label: 'White', src: require('../../assets/sounds/white.wav') },
} as const;
export type Sound = 'off' | keyof typeof SOUNDS;
export const SOUND_KEYS = Object.keys(SOUNDS) as (keyof typeof SOUNDS)[];

let player: AudioPlayer | null = null;
let current: Sound = 'off';
let preview: ReturnType<typeof setTimeout> | null = null;

export function stopAmbient() {
  if (preview) clearTimeout(preview);
  preview = null;
  player?.remove();
  player = null;
  current = 'off';
}

/** volume is a percentage, 0-100. Mixes with other audio so music keeps playing. */
export async function playAmbient(s: Sound, volume: number) {
  if (s === 'off') return stopAmbient();
  if (!player || current !== s) {
    stopAmbient();
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    player = createAudioPlayer(SOUNDS[s].src);
    player.loop = true;
    current = s;
  }
  player.volume = volume / 100;
  player.play();
}

export const setAmbientVolume = (v: number) => { if (player) player.volume = v / 100; };
export const pauseAmbient = () => player?.pause();

export function previewAmbient(s: Sound, volume: number) {
  playAmbient(s, volume);
  if (preview) clearTimeout(preview);
  if (s !== 'off') preview = setTimeout(stopAmbient, 4000);
}

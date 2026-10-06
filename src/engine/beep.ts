import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/** "Beep beep" for the end of a Pomodoro focus or break. Mixes with music and focus sounds. */
export async function playBeep() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' });
    const p = createAudioPlayer(require('../../assets/sounds/beep.ogg'));
    p.volume = 1;
    p.play();
    setTimeout(() => { try { p.remove(); } catch { /* already released */ } }, 2500);
  } catch { /* audio unavailable: the notification still rings */ }
}

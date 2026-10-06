import { Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { useSettings } from '../store';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let describe: () => string = () => '';

// Keeps the process alive while armed/running so flip detection survives switching apps.
async function task() {
  while (BackgroundService.isRunning()) {
    await sleep(30000);
    await BackgroundService.updateNotification({ taskDesc: describe() }).catch(() => {});
  }
}

export async function startBackground(getDesc: () => string) {
  if (Platform.OS !== 'android' || !useSettings.getState().bgService || BackgroundService.isRunning()) return;
  describe = getDesc;
  try {
    await BackgroundService.start(task, {
      taskName: 'Flipside',
      taskTitle: 'Flipside',
      taskDesc: getDesc(),
      taskIcon: { name: 'notification_icon', type: 'drawable' },
      color: '#FFB547',
      linkingURI: 'flipside://',
      foregroundServiceType: ['specialUse'],
    });
  } catch {
    // Android 12+ refuses starting from the background; the timer still works while the app is open
  }
}

export async function stopBackground() {
  if (BackgroundService.isRunning()) await BackgroundService.stop().catch(() => {});
}

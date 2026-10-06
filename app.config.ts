import type { ExpoConfig } from 'expo/config';

const NAME = 'Flipside';

const widget = (name: string, label: string, w: number, h: number, cw: number, ch: number): any => ({
  name, label, minWidth: `${w}dp`, minHeight: `${h}dp`, targetCellWidth: cw, targetCellHeight: ch,
  resizeMode: 'horizontal|vertical', previewImage: `./assets/widgets/${name.toLowerCase()}.png`,
  description: `${NAME} ${label}`, updatePeriodMillis: 1800000,
});

const config: ExpoConfig = {
  name: NAME,
  slug: 'flipside',
  scheme: 'flipside',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.flipside.focus',
    adaptiveIcon: {
      backgroundColor: '#0B0B10',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['VIBRATE'],
  },
  web: { output: 'static', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-sharing',
    ['expo-splash-screen', { backgroundColor: '#0B0B10', image: './assets/images/splash-icon.png', imageWidth: 160 }],
    ['expo-notifications', { color: '#FFB547', icon: './assets/images/notification-icon.png' }],
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false }],
    './plugins/withForegroundService',
    [
      'react-native-android-widget',
      {
        widgets: [
          widget('Today', 'Today', 110, 110, 2, 2),
          widget('QuickStart', 'Quick start', 250, 40, 4, 1),
          widget('Week', 'Week', 250, 110, 4, 2),
        ],
      },
    ],
  ],
  extra: { eas: { projectId: '3aa9bb35-c9f4-48b9-b471-a9b54559b658' } },
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;

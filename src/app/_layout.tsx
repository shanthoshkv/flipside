import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { initDb } from '../db';
import { useData } from '../data';
import { useSettings } from '../store';
import { useTheme } from '../theme';
import { refreshWidgets } from '../widgets/refresh';

SplashScreen.preventAutoHideAsync().catch(() => {});
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function Root() {
  const [fontsOk] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  const [ready, setReady] = useState(false);
  const t = useTheme();

  useEffect(() => {
    (async () => {
      await initDb();
      await useSettings.getState().load();
      await useData.getState().reload();
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Timer', importance: Notifications.AndroidImportance.HIGH }).catch(() => {});
      setReady(true);
      refreshWidgets();
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { useData.getState().reload(); refreshWidgets(); }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => { if (fontsOk && ready) SplashScreen.hideAsync().catch(() => {}); }, [fontsOk, ready]);
  if (!fontsOk || !ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
      </View>
    </GestureHandlerRootView>
  );
}

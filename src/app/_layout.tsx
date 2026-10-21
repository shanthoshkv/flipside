import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { loadFont } from '../appearance';
import { runBackup } from '../backup';
import { Onboarding } from '../components/Onboarding';
import { initDb, setSetting } from '../db';
import { useData } from '../data';
import { useSettings } from '../store';
import { useTheme } from '../theme';
import * as ScreenCapture from 'expo-screen-capture';
import { setDnd } from '../engine/focusmode';
import { setLang } from '../i18n';
import { syncReminders } from '../reminders';
import { refreshWidgets } from '../widgets/refresh';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Keep the message of any uncaught JS error so Settings can show it after a restart.
const errUtils = (globalThis as any).ErrorUtils;
const prevHandler = errUtils?.getGlobalHandler?.();
errUtils?.setGlobalHandler?.((e: any, fatal?: boolean) => {
  try { setSetting('lastError', JSON.stringify(`${fatal ? 'FATAL ' : ''}${e?.message ?? e}\n${String(e?.stack ?? '').split('\n').slice(0, 6).join('\n')}`)); } catch { /* best effort */ }
  prevHandler?.(e, fatal);
});
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function Root() {
  const [ready, setReady] = useState(false);
  const t = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  const lang = useSettings((s) => s.lang);
  setLang(lang); // before children render, so every string picks up the language
  const secure = useSettings((s) => s.secureScreen);
  useEffect(() => { (secure ? ScreenCapture.preventScreenCaptureAsync() : ScreenCapture.allowScreenCaptureAsync()).catch(() => {}); }, [secure]);

  useEffect(() => {
    (async () => {
      await initDb();
      await useSettings.getState().load();
      await loadFont(useSettings.getState().fontPref);
      await useData.getState().reload();
      if (!useSettings.getState().onboarded && useData.getState().tasks.length > 0) useSettings.getState().set('onboarded', true);
      if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Timer', importance: Notifications.AndroidImportance.HIGH }).catch(() => {});
      setDnd(false); // restore any filter left behind if the app died mid-focus
      setReady(true);
      refreshWidgets();
      syncReminders();
      runBackup();
    })();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { useData.getState().reload(); refreshWidgets(); syncReminders(); runBackup(); }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <StatusBar style={t.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
        {!onboarded && <Onboarding />}
      </View>
    </GestureHandlerRootView>
  );
}

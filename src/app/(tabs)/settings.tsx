import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Segmented, Stepper } from '../../components/controls';
import { Btn, Card, Txt } from '../../components/ui';
import { exportAll, importAll, resetAll } from '../../db';
import { useData } from '../../data';
import { useSettings, type Sensitivity, type ThemePref } from '../../store';
import { space, useTheme } from '../../theme';
import { refreshWidgets } from '../../widgets/refresh';

export default function Settings() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const s = useSettings();
  const set = <K extends Parameters<typeof s.set>[0]>(k: K, v: any) => { s.set(k, v); refreshWidgets(); };
  const pad = { marginHorizontal: space(4), gap: space(3) };

  const doExport = async () => {
    try {
      const f = new File(Paths.cache, `flipside-${Date.now()}.json`);
      f.create(); f.write(await exportAll());
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(f.uri, { mimeType: 'application/json' });
      else Alert.alert('Export saved', f.uri);
    } catch (e) { Alert.alert('Export failed', String(e)); }
  };
  const doImport = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (r.canceled) return;
      await importAll(await new File(r.assets[0].uri).text());
      await s.load(); await useData.getState().reload(); refreshWidgets();
      Alert.alert('Imported', 'Your data was restored.');
    } catch (e) { Alert.alert('Import failed', String(e)); }
  };
  const doReset = () => Alert.alert('Reset all data?', 'Tasks, sessions, plans and diary will be deleted. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete everything', style: 'destructive', onPress: async () => { await resetAll(); await useData.getState().reload(); refreshWidgets(); } },
  ]);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(6), gap: space(4) }}>
      <Txt v="h1" style={{ paddingHorizontal: space(4) }}>Settings</Txt>

      <Card style={pad}>
        <Txt v="label">Goal</Txt>
        <Stepper label="Daily goal" value={s.goalMin / 60} unit="h" min={0.5} max={16} step={0.5} onChange={(h) => set('goalMin', Math.round(h * 60))} />
      </Card>

      <Card i={1} style={pad}>
        <Txt v="label">Flip sensitivity</Txt>
        <Segmented<Sensitivity> value={s.sensitivity} onChange={(v) => set('sensitivity', v)}
          options={[{ v: 'low', label: 'Low' }, { v: 'medium', label: 'Medium' }, { v: 'high', label: 'High' }]} />
        <Txt v="small">Low = needs a very flat, still phone. High = starts and stops more easily.</Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}><Txt>Touch to start</Txt><Txt v="small">Tap to start and stop. No flip needed (music-friendly).</Txt></View>
          <Switch value={s.touchToStart} onValueChange={(v) => set('touchToStart', v)} trackColor={{ true: t.accentA, false: t.surface2 }} thumbColor="#fff" />
        </View>
      </Card>

      <Card i={2} style={pad}>
        <Txt v="label">Pomodoro</Txt>
        <Stepper label="Focus" value={s.focusMin} unit="m" min={5} max={90} step={5} onChange={(v) => set('focusMin', v)} />
        <Stepper label="Break" value={s.breakMin} unit="m" min={1} max={30} onChange={(v) => set('breakMin', v)} />
        <Stepper label="Cycles" value={s.cycles} min={1} max={12} onChange={(v) => set('cycles', v)} />
      </Card>

      <Card i={3} style={pad}>
        <Txt v="label">Theme</Txt>
        <Segmented<ThemePref> value={s.theme} onChange={(v) => set('theme', v)}
          options={[{ v: 'auto', label: 'Auto' }, { v: 'dark', label: 'Dark' }, { v: 'light', label: 'Light' }]} />
      </Card>

      <Card i={4} style={pad}>
        <Txt v="label">Data</Txt>
        <Btn kind="ghost" label="Export JSON" onPress={doExport} />
        <Btn kind="ghost" label="Import JSON" onPress={doImport} />
        <Btn kind="danger" label="Reset all data" onPress={doReset} />
      </Card>
    </ScrollView>
  );
}

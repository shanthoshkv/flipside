import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chooseBackupFolder, restoreLatest, runBackup } from '../../backup';
import { AmbientPicker } from '../../components/AmbientPicker';
import { Calibrate } from '../../components/Calibrate';
import { Segmented, Stepper, SwitchRow } from '../../components/controls';
import { Btn, Card, Txt, tap } from '../../components/ui';
import { DataCard } from '../../components/DataCard';
import { previewAmbient, setAmbientVolume } from '../../engine/ambient';
import { playBeep } from '../../engine/beep';
import { dndGranted, openDndSettings } from '../../engine/focusmode';
import { setFontPref } from '../../appearance';
import { FONT_LABELS, type FontPref } from '../../fonts';
import { LANGS, tr } from '../../i18n';
import { ACCENTS, type AccentPref } from '../../palette';
import { PRESETS } from '../../presets';
import { scheduleSync } from '../../reminders';
import { useSettings, type Sensitivity, type ThemePref } from '../../store';
import { radius, space, useTheme } from '../../theme';
import { fmtDate, dayKey } from '../../util';
import { refreshWidgets } from '../../widgets/refresh';
import { withBoundary } from '../../components/ErrorBoundary';

function Settings() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const s = useSettings();
  const [cal, setCal] = useState(false);
  const set = <K extends Parameters<typeof s.set>[0]>(k: K, v: any) => { s.set(k, v); refreshWidgets(); scheduleSync(); };
  const pad = { marginHorizontal: space(4), gap: space(3) };

  const remind = async (k: 'remindPlan' | 'remindStreak' | 'remindWeekly', on: boolean) => {
    if (on && !(await Notifications.requestPermissionsAsync().catch(() => null))?.granted) {
      return Alert.alert(tr('Notifications are off'), tr('Allow notifications for Flipside in system settings to get reminders.'));
    }
    set(k, on);
  };
  const strict = (on: boolean) => {
    set('strictFocus', on);
    if (on && !dndGranted()) Alert.alert(tr('Allow Do Not Disturb access'), tr('Android needs your permission once. On the next screen, turn on Flipside.'), [
      { text: tr('Cancel'), style: 'cancel' }, { text: tr('Open settings'), onPress: openDndSettings },
    ]);
  };

  const pickFolder = async () => {
    try { const err = await chooseBackupFolder(); Alert.alert(err ? tr('Backup failed') : tr('Backup folder set'), err ?? tr('A backup was saved. Flipside now backs up about once a day and keeps the newest 7.')); }
    catch (e) { Alert.alert(tr('Backup failed'), String(e)); }
  };
  const restore = () => Alert.alert(tr('Restore latest backup?'), tr('This replaces everything in the app with the newest backup in your folder.'), [
    { text: tr('Cancel'), style: 'cancel' },
    { text: tr('Restore'), style: 'destructive', onPress: async () => { try { Alert.alert(tr('Restored'), await restoreLatest()); } catch (e) { Alert.alert(tr('Restore failed'), String(e)); } } },
  ]);
  const chip = (on: boolean, label: string, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { tap(); onPress(); }}
      style={{ minHeight: 44, paddingHorizontal: space(4), borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? t.accentA : t.surface2 }}>
      <Txt v="h3" c={on ? '#1A1206' : t.text}>{label}</Txt>
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(8), gap: space(4) }}>
      <Txt v="h1" style={{ paddingHorizontal: space(4) }}>Settings</Txt>

      <Card style={pad}>
        <Txt v="label">Language</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
          {LANGS.map((l) => chip(s.lang === l.code, l.code === 'auto' ? tr('Auto') : l.label, () => s.set('lang', l.code)))}
        </ScrollView>
      </Card>

      <Card i={1} style={pad}>
        <Txt v="label">Goals</Txt>
        <Stepper label="Daily goal" value={s.goalMin / 60} unit="h" min={0.5} max={16} step={0.5} onChange={(h) => set('goalMin', Math.round(h * 60))} />
        <Stepper label="Weekly goal (0 = 7 × daily)" value={s.weeklyGoalMin / 60} unit="h" min={0} max={90} step={1} onChange={(h) => set('weeklyGoalMin', Math.round(h * 60))} />
        <SwitchRow label="Rest day keeps my streak" hint="One day off per week does not break the streak." value={s.restDay} onChange={(v) => set('restDay', v)} />
      </Card>

      <Card i={2} style={pad}>
        <Txt v="label">Flip detection</Txt>
        <Segmented<Sensitivity> value={s.sensitivity} onChange={(v) => set('sensitivity', v)}
          options={[{ v: 'low', label: 'Low' }, { v: 'medium', label: 'Medium' }, { v: 'high', label: 'High' }]} />
        <Txt v="small">{s.calib ? 'Using your calibration. The preset above is ignored.' : 'Low = needs a very flat, still phone. High = starts and stops more easily.'}</Txt>
        <Btn kind="ghost" label={s.calib ? 'Recalibrate' : 'Calibrate for my phone'} onPress={() => setCal(true)} />
        {s.calib && <Btn kind="ghost" label="Use preset instead" onPress={() => set('calib', null)} />}
        <SwitchRow label="Touch to start" hint="Tap to start and stop. No flip needed (music-friendly)." value={s.touchToStart} onChange={(v) => set('touchToStart', v)} />
        <SwitchRow label="Lift pauses instead of stopping" hint="Flip back down to resume the same session. Stopwatch and Flowtime only." value={s.pauseMode} onChange={(v) => set('pauseMode', v)} />
        {s.pauseMode && <Stepper label="End after paused for" value={s.pauseGraceMin} unit="m" min={1} max={30} onChange={(v) => set('pauseGraceMin', v)} />}
      </Card>

      <Card i={3} style={pad}>
        <Txt v="label">Pomodoro</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
          {PRESETS.map((p) => chip(s.focusMin === p.focus && s.breakMin === p.brk, p.label, () => { set('focusMin', p.focus); set('breakMin', p.brk); }))}
        </ScrollView>
        <Stepper label="Focus" value={s.focusMin} unit="m" min={5} max={120} step={5} onChange={(v) => set('focusMin', v)} />
        <Stepper label="Break" value={s.breakMin} unit="m" min={1} max={30} onChange={(v) => set('breakMin', v)} />
        <Stepper label="Cycles" value={s.cycles} min={1} max={12} onChange={(v) => set('cycles', v)} />
        <SwitchRow label="Beep when a focus or break ends" hint="Two short beeps at the end of each Pomodoro phase." value={s.pomoBeep} onChange={(v) => set('pomoBeep', v)} />
        <Btn kind="ghost" label="Test beep" onPress={playBeep} />
      </Card>

      <Card i={4} style={pad}>
        <Txt v="label">Focus sound</Txt>
        <AmbientPicker />
        <Stepper label="Volume" value={s.ambientVolume} unit="%" min={10} max={100} step={10}
          onChange={(v) => { s.set('ambientVolume', v); setAmbientVolume(v); previewAmbient(s.ambient, v); }} />
        <Txt v="small">Plays during focus, pauses on breaks, mixes with your music. Generated on the device, no internet.</Txt>
      </Card>

      <Card i={5} style={pad}>
        <Txt v="label">While focusing</Txt>
        <SwitchRow label="Keep running in background" hint="Shows a notification while listening so flip detection survives switching apps." value={s.bgService} onChange={(v) => set('bgService', v)} />
        <SwitchRow label="Do Not Disturb during focus" hint="Silences notifications except alarms while a session runs, then restores your setting." value={s.strictFocus} onChange={strict} />
      </Card>

      <Card i={6} style={pad}>
        <Txt v="label">Flashcards</Txt>
        <Segmented<'fsrs' | 'sm2'> value={s.scheduler} onChange={(v) => set('scheduler', v)} options={[{ v: 'fsrs', label: 'FSRS' }, { v: 'sm2', label: 'SM-2' }]} />
        <Txt v="small">FSRS adapts to how well you remember each card and usually needs fewer reviews. SM-2 is the classic fixed schedule.</Txt>
        {s.scheduler === 'fsrs' && <Stepper label="Target recall" value={s.retention} unit="%" min={80} max={97} onChange={(v) => set('retention', v)} />}
        <Stepper label="New cards per day" value={s.newPerDay} min={0} max={200} step={5} onChange={(v) => set('newPerDay', v)} />
        <Stepper label="Reviews per day" value={s.reviewsPerDay} min={10} max={1000} step={10} onChange={(v) => set('reviewsPerDay', v)} />
      </Card>

      <Card i={7} style={pad}>
        <Txt v="label">Reminders</Txt>
        <SwitchRow label="Before planned study blocks" hint="10 minutes before each block in your plan." value={s.remindPlan} onChange={(v) => remind('remindPlan', v)} />
        <SwitchRow label="Streak at risk" hint="At 8 pm if you have not focused yet today." value={s.remindStreak} onChange={(v) => remind('remindStreak', v)} />
        <SwitchRow label="Weekly review" hint="Sunday at 7 pm." value={s.remindWeekly} onChange={(v) => remind('remindWeekly', v)} />
        <Stepper label="Quiet from" value={s.quietStart} unit=":00" min={0} max={23} onChange={(v) => set('quietStart', v)} />
        <Stepper label="Quiet until" value={s.quietEnd} unit=":00" min={0} max={23} onChange={(v) => set('quietEnd', v)} />
      </Card>

      <Card i={8} style={pad}>
        <Txt v="label">Appearance</Txt>
        <Segmented<ThemePref> value={s.theme} onChange={(v) => set('theme', v)}
          options={[{ v: 'auto', label: 'Auto' }, { v: 'dark', label: 'Dark' }, { v: 'black', label: 'Black' }, { v: 'light', label: 'Light' }]} />
        <Txt v="label">Font</Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
          {(Object.keys(FONT_LABELS) as FontPref[]).map((f) => chip(s.fontPref === f, tr(FONT_LABELS[f]), () => setFontPref(f)))}
        </ScrollView>
        <Txt v="small">The Default font stays as it was. PixelCode is a pixel-style monospace font (SIL Open Font License).</Txt>
        <Txt v="label">Accent colour</Txt>
        <View style={{ flexDirection: 'row', gap: space(3), flexWrap: 'wrap' }}>
          {(Object.keys(ACCENTS) as AccentPref[]).map((k) => (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${tr('Accent colour')} ${ACCENTS[k].label}`} accessibilityState={{ selected: s.accent === k }}
              onPress={() => { tap(); set('accent', k); }}
              style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: s.accent === k ? t.text : 'transparent' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENTS[k].a, borderBottomRightRadius: 17, borderTopLeftRadius: 17, borderWidth: 6, borderColor: ACCENTS[k].b }} />
            </Pressable>
          ))}
        </View>
        <Txt v="label">Text size</Txt>
        <Segmented<string> value={String(s.textScale)} onChange={(v) => set('textScale', Number(v))}
          options={[{ v: '0.9', label: 'Small' }, { v: '1', label: 'Normal' }, { v: '1.15', label: 'Large' }, { v: '1.3', label: 'Huge' }]} />
      </Card>

      <Card i={8} style={pad}>
        <Txt v="label">General</Txt>
        <Txt>Week starts on</Txt>
        <Segmented<'mon' | 'sun'> value={s.weekStart} onChange={(v) => set('weekStart', v)} options={[{ v: 'mon', label: 'Monday' }, { v: 'sun', label: 'Sunday' }]} />
        <SwitchRow label="24-hour clock" value={s.clock24} onChange={(v) => set('clock24', v)} />
        <SwitchRow label="Vibrate when a session starts or stops" value={s.vibrate} onChange={(v) => set('vibrate', v)} />
        <SwitchRow label="Touch feedback" hint="A light tap when you press buttons." value={s.haptics} onChange={(v) => set('haptics', v)} />
        <SwitchRow label="Block screenshots" hint="Hides the app in recent apps and blocks screen capture." value={s.secureScreen} onChange={(v) => set('secureScreen', v)} />
        <SwitchRow label="Keep the screen on while listening" hint="Needed for reliable flip detection. Turn off to save battery." value={s.keepAwake} onChange={(v) => set('keepAwake', v)} />
      </Card>

      <Card i={9} style={pad}>
        <Txt v="label">Backup</Txt>
        <Txt v="small">{s.backupDir ? (s.lastBackup ? `${tr('Last backup')}: ${fmtDate(dayKey(s.lastBackup))}` : tr('Folder chosen. No backup yet.')) : tr('Choose a folder and Flipside saves a backup about once a day, keeping the newest 7.')}</Txt>
        <Btn kind="ghost" label={s.backupDir ? 'Change backup folder' : 'Choose backup folder'} onPress={pickFolder} />
        {!!s.backupDir && <Btn kind="ghost" label="Back up now" onPress={async () => { const e = await runBackup(true); Alert.alert(e ? tr('Backup failed') : tr('Backed up'), e ?? undefined); }} />}
        {!!s.backupDir && <Btn kind="ghost" label="Restore latest backup" onPress={restore} />}
      </Card>

      <DataCard i={10} />

      <Card i={11} style={pad}>
        <Txt v="label">About</Txt>
        <Txt>Flipside 1.0.0</Txt>
        <Txt v="small">Open source (MIT). No account, no ads, no analytics, and no internet permission: your data never leaves this phone unless you export or back it up yourself.</Txt>
        <Txt v="small">Sounds are field recordings from Wikimedia Commons (public domain, CC0 and CC BY). Fonts: Space Grotesk, Inter, Atkinson Hyperlegible, Lexend, Nunito, Merriweather, JetBrains Mono and PixelCode, all under the SIL Open Font License. Full credits are in CREDITS.md.</Txt>
        {!!s.lastError && (
          <View style={{ gap: space(2) }}>
            <Txt v="label">Last error</Txt>
            <Text selectable style={{ color: t.muted, fontSize: 11 }}>{s.lastError}</Text>
            <Btn kind="ghost" label="Clear" onPress={() => s.set('lastError', '')} />
          </View>
        )}
      </Card>

      <Calibrate visible={cal} onClose={() => setCal(false)} />
    </ScrollView>
  );
}

export default withBoundary(Settings, 'Settings');

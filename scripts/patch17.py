import re, sys

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, '::', a[:100]); sys.exit(1)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

# ---- util: week start + 12/24h ----
sub('src/util.ts', [
 ("/** Monday 00:00 of the week containing ts */\nexport const startOfWeek = (ts: number) => { const d = startOfDay(ts); const dow = (new Date(d).getDay() + 6) % 7; return addDays(d, -dow); };",
  """let weekStartDay = 1; // 1 = Monday, 0 = Sunday
export const setWeekStart = (d: 0 | 1) => { weekStartDay = d; };
/** 00:00 of the first day of the week containing ts */
export const startOfWeek = (ts: number) => { const d = startOfDay(ts); const dow = (new Date(d).getDay() - weekStartDay + 7) % 7; return addDays(d, -dow); };

let use24 = true;
export const set24h = (v: boolean) => { use24 = v; };
/** hour 0-23, minute 0-59, in the user's 12 or 24 hour style */
export const fmtTod = (hour: number, min: number) => (use24 ? `${pad2(hour)}:${pad2(min)}` : `${hour % 12 || 12}:${pad2(min)} ${hour < 12 ? 'AM' : 'PM'}`);"""),
])

# ---- store: new settings ----
sub('src/store.ts', [
 ("import type { Thresh } from './engine/detect';", "import type { Thresh } from './engine/detect';\nimport type { FontPref } from './fonts';\nimport type { AccentPref } from './palette';\nimport { set24h, setWeekStart } from './util';"),
 ("  backupDir: string | null; lastBackup: number;\n  loaded: boolean;", "  backupDir: string | null; lastBackup: number;\n  fontPref: FontPref; accent: AccentPref; textScale: number;\n  vibrate: boolean; haptics: boolean; keepAwake: boolean; weekStart: 'mon' | 'sun'; clock24: boolean; lastError: string;\n  loaded: boolean;"),
 ("  backupDir: null, lastBackup: 0,\n  loaded: false,", "  backupDir: null, lastBackup: 0,\n  fontPref: 'default', accent: 'amber', textScale: 1,\n  vibrate: true, haptics: true, keepAwake: true, weekStart: 'mon', clock24: true, lastError: '',\n  loaded: false,"),
 ("    set({ ...next, loaded: true });", "    set({ ...next, loaded: true });\n    applyUtil(next as Partial<Settings>);"),
 ("    set({ [k]: v } as Partial<Store>);\n    if (k !== 'loaded') setSetting(k, JSON.stringify(v));", "    set({ [k]: v } as Partial<Store>);\n    applyUtil({ [k]: v } as Partial<Settings>);\n    if (k !== 'loaded') setSetting(k, JSON.stringify(v));"),
 ("interface Store extends Settings {", "/** Settings the pure helpers in util.ts need to know about. */\nfunction applyUtil(s: Partial<Settings>) {\n  if (s.weekStart) setWeekStart(s.weekStart === 'sun' ? 0 : 1);\n  if (s.clock24 !== undefined) set24h(s.clock24);\n}\ninterface Store extends Settings {"),
])

# ---- appearance helper ----
open('src/appearance.ts', 'w', encoding='utf-8').write('''import * as Font from 'expo-font';
import { fontFiles, type FontPref } from './fonts';
import { useSettings } from './store';
import { applyFont } from './theme';

/** Load the family first, then switch, so text never flashes in a missing font. */
export async function loadFont(p: FontPref) {
  try { await Font.loadAsync(fontFiles(p)); } catch { /* falls back to the default family */ }
  applyFont(p);
}
export async function setFontPref(p: FontPref) {
  await loadFont(p);
  useSettings.getState().set('fontPref', p);
}
''')

# ---- ui: text scale + touch feedback toggle ----
sub('src/components/ui.tsx', [
 ("import { tr } from '../i18n';", "import { tr } from '../i18n';\nimport { useSettings } from '../store';"),
 ("export const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});", "export const tap = () => { if (useSettings.getState().haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };"),
 ("  const t = useTheme();\n  const base = {", "  const t = useTheme(), scale = useSettings((s) => s.textScale);\n  const base = {"),
 ("  }[v];\n  return <Text {...p}", "  }[v];\n  base.fontSize = Math.round(base.fontSize * scale);\n  return <Text {...p}"),
])

# ---- flip: vibration + keep awake toggles ----
s = open('src/engine/flip.ts', encoding='utf-8').read()
s = s.replace("Vibration.vibrate(60);", "buzz();")
s = s.replace("const canPause =", "const buzz = () => { if (useSettings.getState().vibrate) Vibration.vibrate(60); };\nconst canPause =", 1)
s = s.replace("    activateKeepAwakeAsync(KEEP).catch(() => {});", "    if (useSettings.getState().keepAwake) activateKeepAwakeAsync(KEEP).catch(() => {});", 1)
open('src/engine/flip.ts', 'w', encoding='utf-8').write(s)

# ---- date picker + day detail + session editor: week start, 12/24h ----
sub('src/components/DatePicker.tsx', [
 ("import { dayKey, keyToTs, startOfDay } from '../util';", "import { useSettings } from '../store';\nimport { dayKey, keyToTs, startOfDay } from '../util';"),
 ("const HEAD = [1, 2, 3, 4, 5, 6, 0]; // Monday first\n", ""),
 ("  const t = useTheme();\n  const base =", "  const t = useTheme(), sun = useSettings((s) => s.weekStart) === 'sun';\n  const HEAD = sun ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];\n  const base ="),
 ("const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;", "const lead = sun ? new Date(ym.y, ym.m, 1).getDay() : (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;"),
])
sub('src/components/DayDetail.tsx', [
 ("import { addDays, fmtDate, fmtDur, keyToTs, pad2 } from '../util';", "import { addDays, fmtDate, fmtDur, fmtTod, keyToTs } from '../util';"),
 ("const hm = (ts: number) => `${pad2(new Date(ts).getHours())}:${pad2(new Date(ts).getMinutes())}`;", "const hm = (ts: number) => fmtTod(new Date(ts).getHours(), new Date(ts).getMinutes());"),
])
sub('src/components/SessionEditor.tsx', [
 ("import { addDays, fmtDate, keyToTs, pad2 } from '../util';", "import { addDays, fmtDate, fmtTod, keyToTs } from '../util';"),
 ("const fmtMin = (m: number) => `${pad2(Math.floor((m % 1440) / 60))}:${pad2(m % 60)}${m >= 1440 ? ' (+1d)' : ''}`;", "const fmtMin = (m: number) => `${fmtTod(Math.floor((m % 1440) / 60), m % 60)}${m >= 1440 ? ' (+1d)' : ''}`;"),
])

# ---- error boundary ----
open('src/components/ErrorBoundary.tsx', 'w', encoding='utf-8').write('''import { Component, type ComponentType, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSettings } from '../store';
import { Btn, Txt } from './ui';

interface P { name: string; children: ReactNode }
interface S { err: Error | null }

/** A render error on one screen shows its message and a retry button instead of closing the whole app. */
export class ErrorBoundary extends Component<P, S> {
  state: S = { err: null };
  static getDerivedStateFromError(err: Error): S { return { err }; }
  componentDidCatch(err: Error) {
    try { useSettings.getState().set('lastError', `${this.props.name}: ${err.message}\\n${(err.stack ?? '').split('\\n').slice(0, 6).join('\\n')}`); } catch { /* storage unavailable */ }
  }
  render() {
    const { err } = this.state;
    if (!err) return this.props.children;
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#0B0B10' }}>
        <Txt v="h2" c="#F4F4F8" raw>{`${this.props.name} hit a problem`}</Txt>
        <ScrollView style={{ maxHeight: 220 }}><Text selectable style={{ color: '#FF9B9B', fontSize: 12 }}>{`${err.message}\\n\\n${(err.stack ?? '').split('\\n').slice(0, 6).join('\\n')}`}</Text></ScrollView>
        <Btn label="Try again" onPress={() => this.setState({ err: null })} />
      </View>
    );
  }
}

export const withBoundary = <T extends object>(C: ComponentType<T>, name: string) =>
  function Guarded(props: T) { return <ErrorBoundary name={name}><C {...props} /></ErrorBoundary>; };
''')

for f, nm, cn in [('src/app/(tabs)/index.tsx', 'Timer', 'TimerScreen'), ('src/app/(tabs)/plan.tsx', 'Plan', 'Plan'), ('src/app/(tabs)/study.tsx', 'Study', 'Study'),
                  ('src/app/(tabs)/stats.tsx', 'Stats', 'Stats'), ('src/app/(tabs)/settings.tsx', 'Settings', 'Settings'),
                  ('src/app/cards.tsx', 'Flashcards', 'Cards'), ('src/app/review.tsx', 'Review', 'Review')]:
    s = open(f, encoding='utf-8').read()
    a = f"export default function {cn}("
    if a not in s:
        print('MISSING', f, a); sys.exit(1)
    s = s.replace(a, f"function {cn}(", 1)
    s = s.rstrip('\n') + f"\n\nexport default withBoundary({cn}, '{nm}');\n"
    # import after the last top-level import line
    lines = s.split('\n'); idx = max(i for i, l in enumerate(lines) if l.startswith('import '))
    lines.insert(idx + 1, "import { withBoundary } from '" + ('../../' if '(tabs)' in f else '../') + "components/ErrorBoundary';")
    open(f, 'w', encoding='utf-8').write('\n'.join(lines))

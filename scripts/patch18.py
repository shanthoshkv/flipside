import sys

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, '::', a[:100]); sys.exit(1)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

sub('src/app/(tabs)/settings.tsx', [
 ("import { LANGS, tr } from '../../i18n';", "import { setFontPref } from '../../appearance';\nimport { FONT_LABELS, type FontPref } from '../../fonts';\nimport { LANGS, tr } from '../../i18n';\nimport { ACCENTS, type AccentPref } from '../../palette';"),
 # replace the old Theme card with Appearance + General
 ("""      <Card i={8} style={pad}>
        <Txt v="label">Theme</Txt>
        <Segmented<ThemePref> value={s.theme} onChange={(v) => set('theme', v)}
          options={[{ v: 'auto', label: 'Auto' }, { v: 'dark', label: 'Dark' }, { v: 'light', label: 'Light' }]} />
      </Card>
""", """      <Card i={8} style={pad}>
        <Txt v="label">Appearance</Txt>
        <Segmented<ThemePref> value={s.theme} onChange={(v) => set('theme', v)}
          options={[{ v: 'auto', label: 'Auto' }, { v: 'dark', label: 'Dark' }, { v: 'light', label: 'Light' }]} />
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
        <SwitchRow label="Keep the screen on while listening" hint="Needed for reliable flip detection. Turn off to save battery." value={s.keepAwake} onChange={(v) => set('keepAwake', v)} />
      </Card>
"""),
 ("""        <Txt v="small">Open source (MIT). No account, no ads, no analytics, and no internet permission: your data never leaves this phone unless you export or back it up yourself.</Txt>
""", """        <Txt v="small">Open source (MIT). No account, no ads, no analytics, and no internet permission: your data never leaves this phone unless you export or back it up yourself.</Txt>
        <Txt v="small">Sounds are field recordings from Wikimedia Commons (public domain, CC0 and CC BY). Fonts: Space Grotesk, Inter, Atkinson Hyperlegible, Lexend, Nunito, Merriweather, JetBrains Mono and PixelCode, all under the SIL Open Font License. Full credits are in CREDITS.md.</Txt>
        {!!s.lastError && (
          <View style={{ gap: space(2) }}>
            <Txt v="label">Last error</Txt>
            <Text selectable style={{ color: t.muted, fontSize: 11 }}>{s.lastError}</Text>
            <Btn kind="ghost" label="Clear" onPress={() => s.set('lastError', '')} />
          </View>
        )}
"""),
 ("import { Alert, Pressable, ScrollView, View } from 'react-native';", "import { Alert, Pressable, ScrollView, Text, View } from 'react-native';"),
])

# root layout: load the chosen font before first paint, global error recorder
s = open('src/app/_layout.tsx', encoding='utf-8').read()
import re
s = re.sub(r"import \{ Inter_400Regular.*?\n", "", s)
s = re.sub(r"import \{ SpaceGrotesk_600SemiBold.*?\n", "", s)
s = s.replace("import { useFonts } from 'expo-font';\n", "")
s = s.replace("import { runBackup } from '../backup';", "import { loadFont } from '../appearance';\nimport { runBackup } from '../backup';")
s = s.replace("import { initDb } from '../db';", "import { initDb, setSetting } from '../db';")
s = s.replace("import { setDnd } from '../engine/focusmode';", "import { setDnd } from '../engine/focusmode';\nimport { setLang } from '../i18n';")
s = s.replace("  const [fontsOk] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });\n", "")
s = s.replace("  const onboarded = useSettings((s) => s.onboarded);\n", "  const onboarded = useSettings((s) => s.onboarded);\n  const lang = useSettings((s) => s.lang);\n  setLang(lang); // before children render, so every string picks up the language\n")
s = s.replace("      await useSettings.getState().load();\n", "      await useSettings.getState().load();\n      await loadFont(useSettings.getState().fontPref);\n")
s = s.replace("  useEffect(() => { if (fontsOk && ready) SplashScreen.hideAsync().catch(() => {}); }, [fontsOk, ready]);\n  if (!fontsOk || !ready) return null;", "  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);\n  if (!ready) return null;")
s = s.replace("SplashScreen.preventAutoHideAsync().catch(() => {});", """SplashScreen.preventAutoHideAsync().catch(() => {});
// Keep the message of any uncaught JS error so Settings can show it after a restart.
const errUtils = (globalThis as any).ErrorUtils;
const prevHandler = errUtils?.getGlobalHandler?.();
errUtils?.setGlobalHandler?.((e: any, fatal?: boolean) => {
  try { setSetting('lastError', JSON.stringify(`${fatal ? 'FATAL ' : ''}${e?.message ?? e}\\n${String(e?.stack ?? '').split('\\n').slice(0, 6).join('\\n')}`)); } catch { /* best effort */ }
  prevHandler?.(e, fatal);
});""")
open('src/app/_layout.tsx', 'w', encoding='utf-8').write(s)

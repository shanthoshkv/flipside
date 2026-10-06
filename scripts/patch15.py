import sys

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, '::', a[:100]); sys.exit(1)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

sub('src/components/DayDetail.tsx', [
 ("import { radius, space, useTheme } from '../theme';", "import { tr } from '../i18n';\nimport { radius, space, useTheme } from '../theme';"),
 ("if (!k) return id === 0 ? 'Focus' : 'Deleted task';", "if (!k) return id === 0 ? tr('Focus') : tr('Deleted task');"),
 ("Alert.alert('Delete this session?', 'This removes its time from your stats.', [\n    { text: 'Cancel', style: 'cancel' },\n    { text: 'Delete', style: 'destructive',", "Alert.alert(tr('Delete this session?'), tr('This removes its time from your stats.'), [\n    { text: tr('Cancel'), style: 'cancel' },\n    { text: tr('Delete'), style: 'destructive',"),
 ("{pickups > 0 && <Txt v=\"small\">Phone pickups mid-session: {pickups}</Txt>}", "{pickups > 0 && <Txt v=\"small\">{tr('Phone pickups mid-session: {n}', { n: pickups })}</Txt>}"),
 ("<Txt v=\"h3\" style={{ flex: 1 }}>{name(s.task_id)}</Txt>", "<Txt v=\"h3\" raw style={{ flex: 1 }}>{name(s.task_id)}</Txt>"),
 ("<Txt v=\"small\">{hm(s.start_ts)} – {hm(e)}{s.quality ? ` · focus ${s.quality}/5 ${FACE[s.quality]}` : ''}{s.breaks ? ' · paused' : ''}{s.mode === 'manual' ? ' · added by hand' : ''}</Txt>", "<Txt v=\"small\" raw>{`${hm(s.start_ts)} – ${hm(e)}${s.quality ? ` · ${tr('focus {q}/5', { q: s.quality })} ${tr(FACE[s.quality])}` : ''}${s.breaks ? ` · ${tr('paused')}` : ''}${s.mode === 'manual' ? ` · ${tr('added by hand')}` : ''}`}</Txt>"),
 ("{!!s.note && <Txt>{s.note}</Txt>}", "{!!s.note && <Txt raw>{s.note}</Txt>}"),
 ("{lines.map((l, i) => <Txt key={i}>• {l}</Txt>)}", "{lines.map((l, i) => <Txt key={i} raw>{`• ${l}`}</Txt>)}"),
])

sub('src/components/Reflect.tsx', [
 ("import { fmtDur } from '../util';", "import { tr } from '../i18n';\nimport { fmtDur } from '../util';"),
 ("{run && <Txt v=\"small\">You focused for {fmtDur(run.ms)}.{run.mode === 'flowtime' ? ` Suggested break: ${breakMin} min.` : ''}</Txt>}", "{run && <Txt v=\"small\" raw>{`${tr('You focused for {t}.', { t: fmtDur(run.ms) })}${run.mode === 'flowtime' ? ` ${tr('Suggested break: {n} min.', { n: breakMin })}` : ''}`}</Txt>}"),
 ("placeholder=\"What did you cover? (optional)\"", "placeholder={tr('What did you cover? (optional)')}"),
])

sub('src/components/SessionEditor.tsx', [
 ("import { font, radius, space, useTheme } from '../theme';", "import { tr } from '../i18n';\nimport { font, radius, space, useTheme } from '../theme';"),
 ("'End must be after start.' : endTs > now ? 'End is in the future.' : '';", "tr('End must be after start.') : endTs > now ? tr('End is in the future.') : '';"),
 ("<Txt v=\"h2\">{session ? 'Edit session' : 'Add session'} · {fmtDate(day)}</Txt>", "<Txt v=\"h2\" raw>{`${tr(session ? 'Edit session' : 'Add session')} · ${fmtDate(day)}`}</Txt>"),
 ("placeholder=\"Note (optional)\"", "placeholder={tr('Note (optional)')}"),
])

sub('src/components/DatePicker.tsx', [
 ("import { radius, space, useTheme } from '../theme';", "import { monthName, tr, weekdayLetter } from '../i18n';\nimport { radius, space, useTheme } from '../theme';"),
 ("const HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];\n", "const HEAD = [1, 2, 3, 4, 5, 6, 0]; // Monday first\n"),
 ("<Txt v=\"h3\">{MONTHS[ym.m]} {ym.y}</Txt>", "<Txt v=\"h3\" raw>{`${monthName(ym.m)} ${ym.y}`}</Txt>"),
 ("{HEAD.map((h, i) => <Txt key={i} v=\"small\" style={{ flex: 1, textAlign: 'center' }}>{h}</Txt>)}", "{HEAD.map((h, i) => <Txt key={i} v=\"small\" raw style={{ flex: 1, textAlign: 'center' }}>{weekdayLetter(h)}</Txt>)}"),
 ("accessibilityLabel={`${d} ${MONTHS[ym.m]} ${ym.y}`}", "accessibilityLabel={`${d} ${monthName(ym.m)} ${ym.y}`}"),
 ("accessibilityLabel={d < 0 ? 'Previous month' : 'Next month'}", "accessibilityLabel={tr(d < 0 ? 'Previous month' : 'Next month')}"),
 ("import { dayKey, keyToTs, MONTHS, startOfDay } from '../util';", "import { dayKey, keyToTs, startOfDay } from '../util';"),
])

sub('src/components/TaskChips.tsx', [
 ("import { categoryColors, font, radius, space, useTheme } from '../theme';", "import { tr } from '../i18n';\nimport { categoryColors, font, radius, space, useTheme } from '../theme';"),
 ("<Txt v=\"h3\" c={on ? '#1A1206' : t.text}>{k.name}</Txt>", "<Txt v=\"h3\" raw c={on ? '#1A1206' : t.text}>{k.id === 0 ? tr('No task') : k.name}</Txt>"),
 ("(simple ? [['Name', name, setName]] : [['Name', name, setName], ['Category (optional)', cat, setCat]])", "(simple ? [[tr('Name'), name, setName]] : [[tr('Name'), name, setName], [tr('Category (optional)'), cat, setCat]])"),
])

sub('src/components/TaskPicker.tsx', [
 ("import { categoryColors, space } from '../theme';", "import { tr } from '../i18n';\nimport { categoryColors, space } from '../theme';"),
 ("<Txt v=\"label\" style={{ paddingHorizontal: space(4) }}>Topics · {subject.name}</Txt>", "<Txt v=\"label\" raw style={{ paddingHorizontal: space(4) }}>{`${tr('Topics')} · ${subject.name}`}</Txt>"),
])

sub('src/components/Onboarding.tsx', [
 ("import { categoryColors, font, radius, space, useTheme } from '../theme';", "import { tr } from '../i18n';\nimport { categoryColors, font, radius, space, useTheme } from '../theme';"),
 ("placeholder=\"e.g. Physics\"", "placeholder={tr('e.g. Physics')}"),
])

sub('src/engine/flip.ts', [
 ("import { syncReminders } from '../reminders';", "import { tr } from '../i18n';\nimport { syncReminders } from '../reminders';"),
 ("if (s.status === 'PAUSED') return 'Paused. Flip back to resume';\n  if (s.status !== 'RUNNING') return 'Flip your phone face-down to start';\n  return s.phase === 'break' ? 'On a break' : `Focusing · ${fmtDur(s.acc + Date.now() - s.startTs)}`;",
  "if (s.status === 'PAUSED') return tr('Paused. Flip back to resume');\n  if (s.status !== 'RUNNING') return tr('Flip your phone face-down to start');\n  return s.phase === 'break' ? tr('On a break') : tr('Focusing · {t}', { t: fmtDur(s.acc + Date.now() - s.startTs) });"),
 ("content: { title: c === cycles ? 'Pomodoro complete' : 'Focus done', body: c === cycles ? 'Great work. All cycles finished.' : `Take a ${breakMin} min break.` },", "content: { title: tr(c === cycles ? 'Pomodoro complete' : 'Focus done'), body: c === cycles ? tr('Great work. All cycles finished.') : tr('Take a {n} min break.', { n: breakMin }) },"),
 ("content: { title: 'Break over', body: 'Back to focus.' },", "content: { title: tr('Break over'), body: tr('Back to focus.') },"),
])

sub('src/reminders.ts', [
 ("import { useData } from './data';", "import { useData } from './data';\nimport { tr } from './i18n';"),
 ("return k ? (p ? `${p.name} › ${k.name}` : k.name) : 'Focus';", "return k ? (p ? `${p.name} › ${k.name}` : k.name) : tr('Focus');"),
 ("'Study block in 10 minutes', name(b.taskId)", "tr('Study block in 10 minutes'), name(b.taskId)"),
 ("const body = run > 0 ? `Keep your ${run}-day streak. Ten minutes counts.` : 'A short session keeps the habit going.';", "const body = run > 0 ? tr('Keep your {n}-day streak. Ten minutes counts.', { n: run }) : tr('A short session keeps the habit going.');"),
 ("'No focus yet today', body)", "tr('No focus yet today'), body)"),
 ("'Your week in review', 'See how this week went in Stats.')", "tr('Your week in review'), tr('See how this week went in Stats.'))"),
])

import sys

def sub(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISSING in', p, '::', a[:90]); sys.exit(1)
        s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

# ---------- infrastructure ----------
sub('src/components/ui.tsx', [
 ("export function Txt({ v = 'body', c, style, ...p }: TextProps & { v?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label'; c?: string }) {",
  "export function Txt({ v = 'body', c, style, raw, ...p }: TextProps & { v?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label'; c?: string; raw?: boolean }) {"),
 ("children={typeof p.children === 'string' ? tr(p.children) : p.children}", "children={typeof p.children === 'string' && !raw ? tr(p.children) : p.children}"),
])
sub('src/i18n.ts', [
 ("const MONTHS =", "/** 'today', 'yesterday', '3d ago' */\nexport function agoLabel(ts: number, now = Date.now()) {\n  const d = Math.floor((new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() - new Date(new Date(ts).setHours(0, 0, 0, 0)).getTime()) / 86400000);\n  return d <= 0 ? tr('today') : d === 1 ? tr('yesterday') : tr('{n}d ago', { n: d });\n}\n\nconst MONTHS ="),
])

# ---------- weekly: structured suggestion ----------
sub('src/weekly.ts', [
 ("  let suggestion: string;\n  if (neglected) suggestion = `${subName(neglected.subjectId)} has had no focus for ${neglected.since === Infinity ? 'a while' : `${neglected.since} days`} and ${neglected.name} is in ${neglected.days} day${neglected.days === 1 ? '' : 's'}. Plan a block for it soon.`;\n  else if (goalPct < 0.7) suggestion = `You reached ${Math.round(goalPct * 100)}% of your weekly goal. About ${Math.max(5, Math.ceil((o.weeklyGoalMs - cur) / 7 / 300000) * 5)} more minutes a day closes the gap.`;\n  else if (delta != null && delta >= 0.1) suggestion = `Up ${Math.round(delta * 100)}% on last week. Keep that rhythm.`;\n  else suggestion = 'A steady week. Keep it going.';",
  """  // English text for tests; key + vars let the UI translate it
  let key: string, vars: Record<string, string | number>;
  if (neglected) {
    const lonely = neglected.since === Infinity;
    key = lonely ? '{subject} has had no focus for a while and {exam} is in {days} days. Plan a block for it soon.' : '{subject} has had no focus for {since} days and {exam} is in {days} days. Plan a block for it soon.';
    vars = { subject: subName(neglected.subjectId), since: neglected.since, exam: neglected.name, days: neglected.days };
  } else if (goalPct < 0.7) {
    key = 'You reached {pct}% of your weekly goal. About {min} more minutes a day closes the gap.';
    vars = { pct: Math.round(goalPct * 100), min: Math.max(5, Math.ceil((o.weeklyGoalMs - cur) / 7 / 300000) * 5) };
  } else if (delta != null && delta >= 0.1) {
    key = 'Up {pct}% on last week. Keep that rhythm.'; vars = { pct: Math.round(delta * 100) };
  } else { key = 'A steady week. Keep it going.'; vars = {}; }
  const suggestion = key.replace(/\\{(\\w+)\\}/g, (_, k) => String(vars[k]));"""),
 ("pickups: week.reduce((n, s) => n + (s.breaks ?? 0), 0), sessions: week.length, cardsReviewed: o.cardsReviewed, suggestion,", "pickups: week.reduce((n, s) => n + (s.breaks ?? 0), 0), sessions: week.length, cardsReviewed: o.cardsReviewed, suggestion, suggestionKey: key, suggestionVars: vars,"),
])
sub('scripts/check.ts', [("assert.ok(w1.suggestion.includes('Plan a block'), 'neglected subject with near exam');", "assert.ok(w1.suggestion.includes('Plan a block') && w1.suggestion.includes('Chem exam') && !w1.suggestion.includes('{'), 'neglected subject with near exam');")])

# ---------- WeekCards ----------
sub('src/components/WeekCards.tsx', [
 ("import { weeklyReview } from '../weekly';", "import { tr } from '../i18n';\nimport { weeklyReview } from '../weekly';"),
 ("{r.delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(r.delta * 100))}% vs last week", "{`${r.delta >= 0 ? '▲' : '▼'} ${tr('{n}% vs last week', { n: Math.abs(Math.round(r.delta * 100)) })}`}"),
 ("<Txt v=\"small\">{Math.round(r.goalPct * 100)}% of your weekly goal</Txt>", "<Txt v=\"small\">{tr('{n}% of your weekly goal', { n: Math.round(r.goalPct * 100) })}</Txt>"),
 ("{r.quality != null && stat('Focus quality', `${r.quality.toFixed(1)}${r.qualityPrev != null ? ` (was ${r.qualityPrev.toFixed(1)})` : ''}`)}", "{r.quality != null && stat('Focus quality', r.qualityPrev != null ? tr('{a} (was {b})', { a: r.quality.toFixed(1), b: r.qualityPrev.toFixed(1) }) : r.quality.toFixed(1))}"),
 ("      <Txt>{r.suggestion}</Txt>", "      <Txt raw>{tr(r.suggestionKey, r.suggestionVars)}</Txt>"),
 ("  const name = (id: number) => tasks.find((k) => k.id === id)?.name ?? (id === 0 ? 'Focus' : 'Deleted');", "  const name = (id: number) => tasks.find((k) => k.id === id)?.name ?? (id === 0 ? tr('Focus') : tr('Deleted task'));"),
 ("<Txt v=\"label\">{k}</Txt><Txt v=\"h3\">{v}</Txt></View>;", "<Txt v=\"label\">{k}</Txt><Txt v=\"h3\" raw>{v}</Txt></View>;"),
])

# ---------- Timer ----------
sub('src/app/(tabs)/index.tsx', [
 ("import { dayKey, daysUntil, fmtClock, fmtDur, startOfDay, startOfWeek } from '../../util';", "import { tr } from '../../i18n';\nimport { dayKey, daysUntil, fmtClock, fmtDur, startOfDay, startOfWeek } from '../../util';"),
 ("<Txt v=\"label\">{task ? (task.parent_id ? `${tasks.find((k) => k.id === task.parent_id)?.name ?? ''} › ${task.name}` : task.name) : 'Focus'}{pomo ? ` · ${f.phase}` : ''}</Txt>",
  "<Txt v=\"label\" raw>{`${task ? (task.parent_id ? `${tasks.find((k) => k.id === task.parent_id)?.name ?? ''} › ${task.name}` : task.name) : tr('Focus')}${pomo ? ` · ${tr(f.phase === 'focus' ? 'Focus' : 'Break')}` : ''}`}</Txt>"),
 ("<Txt v=\"h3\">{next.name} · {next.days === 0 ? 'today' : `${next.days} day${next.days === 1 ? '' : 's'}`}</Txt>", "<Txt v=\"h3\" raw>{`${next.name} · ${next.days === 0 ? tr('today') : next.days === 1 ? tr('1 day') : tr('{n} days', { n: next.days })}`}</Txt>"),
 ("{next.total ? `${next.done}/${next.total} topics covered` : 'Add topics in Study to track coverage'}", "{next.total ? tr('{done}/{total} topics covered', { done: next.done, total: next.total }) : 'Add topics in Study to track coverage'}"),
 ("<Txt v=\"small\" c=\"#3A3A46\">{f.status === 'PAUSED' ? 'Paused' : task?.name}{pomo ? ` · ${f.phase} ${f.cycle}/${cfg.cycles}` : ''}</Txt>", "<Txt v=\"small\" c=\"#3A3A46\" raw>{`${f.status === 'PAUSED' ? tr('Paused') : task?.name ?? ''}${pomo ? ` · ${tr(f.phase === 'focus' ? 'Focus' : 'Break')} ${f.cycle}/${cfg.cycles}` : ''}`}</Txt>"),
 ("<Txt v=\"h3\">{dueCards} due</Txt>", "<Txt v=\"h3\">{tr('{n} due', { n: dueCards })}</Txt>"),
])

# ---------- Plan ----------
sub('src/app/(tabs)/plan.tsx', [
 ("import { addDays, dayKey, daysUntil, keyToTs, pad2, startOfDay } from '../../util';", "import { tr, weekdayShort } from '../../i18n';\nimport { addDays, dayKey, daysUntil, keyToTs, pad2, startOfDay } from '../../util';"),
 ("const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n", ""),
 ("Alert.alert('No subjects', 'Add subjects and topics in the Study tab first.')", "Alert.alert(tr('No subjects'), tr('Add subjects and topics in the Study tab first.'))"),
 ("Alert.alert(added ? 'Planned' : 'Nothing to add', added ? `${added * 10} minutes scheduled. Existing dots were kept.` : 'No free time in your study window, or the daily goal is already planned.');",
  "Alert.alert(added ? tr('Planned') : tr('Nothing to add'), added ? tr('{n} minutes scheduled. Existing dots were kept.', { n: added * 10 }) : tr('No free time in your study window, or the daily goal is already planned.'));"),
 ("Alert.alert('Clear this day\\'s plan?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive',", "Alert.alert(tr('Clear this day\\'s plan?'), undefined, [{ text: tr('Cancel'), style: 'cancel' }, { text: tr('Clear'), style: 'destructive',"),
 ("accessibilityLabel={`${DOW[new Date(d).getDay()]} ${new Date(d).getDate()}`}", "accessibilityLabel={`${weekdayShort(new Date(d).getDay())} ${new Date(d).getDate()}`}"),
 ("<Txt v=\"small\" c={on ? '#1A1206' : t.muted}>{DOW[new Date(d).getDay()]}</Txt>", "<Txt v=\"small\" c={on ? '#1A1206' : t.muted} raw>{weekdayShort(new Date(d).getDay())}</Txt>"),
 ("placeholder={['What went well', 'What was hard', 'Tomorrow I will'][i]}", "placeholder={tr(['What went well', 'What was hard', 'Tomorrow I will'][i])}"),
])

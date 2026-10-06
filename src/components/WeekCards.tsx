import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { reviewsBetween } from '../db';
import { useData } from '../data';
import { monthName, tr, weekdayLetter } from '../i18n';
import { totalMs, weekDays } from '../stats';
import { useSettings, weeklyGoal } from '../store';
import { space, useTheme } from '../theme';
import { weeklyReview } from '../weekly';
import { addDays, daysUntil, fmtDate, fmtDur, startOfWeek } from '../util';
import { WeekTimeline } from './charts2';
import { DayDetail } from './DayDetail';
import { rootOf } from './TaskPicker';
import { Card, Txt, tap } from './ui';

const Bar = ({ pct, color }: { pct: number; color: string }) => {
  const t = useTheme();
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}><View style={{ width: `${Math.min(100, Math.max(0, pct) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: color }} /></View>;
};

const dm = (ts: number) => `${new Date(ts).getDate()} ${monthName(new Date(ts).getMonth()).slice(0, 3)}`;

/**
 * Weekly review, laid out as a timetable: a column per day, hours down the side, one coloured block per session,
 * day totals underneath, arrows to move between weeks. A written summary and one suggestion follow.
 */
export function WeeklyReviewCard() {
  const t = useTheme();
  const { sessions, tasks, exams } = useData();
  const cfg = useSettings();
  const [offset, setOffset] = useState(0), [cards, setCards] = useState(0), [day, setDay] = useState<string | null>(null);
  const now = Date.now(), from = addDays(startOfWeek(now), offset * 7), to = addDays(from, 7);
  useEffect(() => { reviewsBetween(from, to).then(setCards); }, [sessions, from]);

  const days = useMemo(() => weekDays(sessions, from), [sessions, from]);
  const total = days.reduce((n, d) => n + d.ms, 0);
  const r = useMemo(() => weeklyReview({
    sessions, now: Math.min(now, to - 1), range: { from, to }, weeklyGoalMs: weeklyGoal(cfg) * 60000, rootOf: (id) => rootOf(tasks, id), cardsReviewed: cards,
    subjects: tasks.filter((k) => !k.parent_id), exams: exams.map((e) => ({ subjectId: e.task_id, days: daysUntil(e.date), name: e.name })),
  }), [sessions, tasks, exams, cards, from, cfg.goalMin, cfg.weeklyGoalMin]);
  if (sessions.length === 0) return null;

  const colorOf = (id: number) => (id === 0 ? t.muted : tasks.find((k) => k.id === rootOf(tasks, id))?.color ?? t.accentA);
  const name = (id: number) => tasks.find((k) => k.id === id)?.name ?? (id === 0 ? tr('Focus') : tr('Deleted task'));
  const used = [...new Set(days.flatMap((d) => d.blocks.map((b) => rootOf(tasks, b.task_id))))];
  const stat = (k: string, v: string) => <View style={{ minWidth: '45%', flexGrow: 1 }}><Txt v="label">{k}</Txt><Txt v="h3" raw>{v}</Txt></View>;
  const nav = (d: number, glyph: string, label: string, off: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={tr(label)} disabled={off} onPress={() => { tap(); setOffset(offset + d); }}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.3 : 1 }}><Txt v="h2" raw>{glyph}</Txt></Pressable>
  );

  return (
    <Card style={{ marginHorizontal: space(4), gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View><Txt v="label">Weekly review</Txt><Txt v="h1" raw>{fmtDur(total)}</Txt></View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {nav(-1, '‹', 'Previous week', false)}
          <View style={{ alignItems: 'center', minWidth: 112 }}>
            <Txt v="h3" raw>{`${dm(from)} – ${dm(to - 1)}`}</Txt>
            <Txt v="small" raw>{offset === 0 ? tr('This week') : new Date(from).getFullYear()}</Txt>
          </View>
          {nav(1, '›', 'Next week', offset >= 0)}
        </View>
      </View>

      <WeekTimeline days={days} colorOf={colorOf} onSelect={setDay} dayLabel={(ts) => weekdayLetter(new Date(ts).getDay())} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
        {used.map((id) => (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colorOf(id) }} /><Txt v="small" raw>{name(id)}</Txt>
          </View>
        ))}
      </View>

      {r.delta != null && <Txt v="small" c={r.delta >= 0 ? t.success : t.danger} raw>{`${r.delta >= 0 ? '▲' : '▼'} ${tr('{n}% vs last week', { n: Math.abs(Math.round(r.delta * 100)) })}`}</Txt>}
      <Bar pct={r.goalPct} color={t.accentA} />
      <Txt v="small" raw>{tr('{n}% of your weekly goal', { n: Math.round(r.goalPct * 100) })}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
        {stat(tr('Active days'), `${r.activeDays} / 7`)}
        {stat(tr('Sessions'), String(r.sessions))}
        {r.best && stat(tr('Best day'), `${fmtDate(r.best.key)} · ${fmtDur(r.best.ms)}`)}
        {r.top && stat(tr('Most time'), `${name(r.top.id)} · ${fmtDur(r.top.ms)}`)}
        {r.quality != null && stat(tr('Focus quality'), r.qualityPrev != null ? tr('{a} (was {b})', { a: r.quality.toFixed(1), b: r.qualityPrev.toFixed(1) }) : r.quality.toFixed(1))}
        {r.cardsReviewed > 0 && stat(tr('Cards reviewed'), String(r.cardsReviewed))}
        {r.pickups > 0 && stat(tr('Phone pickups'), String(r.pickups))}
      </View>
      <Txt raw>{tr(r.suggestionKey, r.suggestionVars)}</Txt>
      <DayDetail day={day} sessions={sessions} tasks={tasks} onClose={() => setDay(null)} />
    </Card>
  );
}

/** This calendar week: overall goal plus any per-subject targets. */
export function GoalsCard() {
  const t = useTheme();
  const { sessions, tasks } = useData();
  const cfg = useSettings();
  const now = Date.now(), a = startOfWeek(now), b = addDays(a, 7);
  const goal = weeklyGoal(cfg) * 60000, done = totalMs(sessions, a, b);
  const targets = tasks.filter((k) => !k.parent_id && k.weekly_goal_min > 0).map((k) => ({
    k, ms: totalMs(sessions.filter((s) => rootOf(tasks, s.task_id) === k.id), a, b),
  }));
  return (
    <Card style={{ marginHorizontal: space(4), gap: space(3) }}>
      <Txt v="label">Goals · this week</Txt>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h3">All study</Txt><Txt v="small" raw>{`${fmtDur(done)} / ${fmtDur(goal)}`}</Txt></View>
        <Bar pct={done / goal} color={done >= goal ? t.success : t.accentA} />
      </View>
      {targets.map(({ k, ms }) => (
        <View key={k.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h3" raw>{k.name}</Txt><Txt v="small" raw>{`${fmtDur(ms)} / ${fmtDur(k.weekly_goal_min * 60000)}`}</Txt></View>
          <Bar pct={ms / (k.weekly_goal_min * 60000)} color={ms >= k.weekly_goal_min * 60000 ? t.success : k.color} />
        </View>
      ))}
      {targets.length === 0 && <Txt v="small">Set a weekly target per subject in the Study tab.</Txt>}
    </Card>
  );
}

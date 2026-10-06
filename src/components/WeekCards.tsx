import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { reviewedSince } from '../db';
import { useData } from '../data';
import { totalMs } from '../stats';
import { useSettings, weeklyGoal } from '../store';
import { space, useTheme } from '../theme';
import { weeklyReview } from '../weekly';
import { addDays, daysUntil, fmtDate, fmtDur, startOfDay, startOfWeek } from '../util';
import { rootOf } from './TaskPicker';
import { Card, Txt } from './ui';

const Bar = ({ pct, color }: { pct: number; color: string }) => {
  const t = useTheme();
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}><View style={{ width: `${Math.min(100, pct * 100)}%`, height: 8, borderRadius: 4, backgroundColor: color }} /></View>;
};

/** Last 7 days against the 7 before, with one concrete suggestion. */
export function WeeklyReviewCard() {
  const t = useTheme();
  const { sessions, tasks, exams } = useData();
  const cfg = useSettings();
  const [cards, setCards] = useState(0);
  useEffect(() => { reviewedSince(addDays(startOfDay(Date.now()), -6)).then(setCards); }, [sessions]);
  const r = useMemo(() => weeklyReview({
    sessions, now: Date.now(), weeklyGoalMs: weeklyGoal(cfg) * 60000, rootOf: (id) => rootOf(tasks, id), cardsReviewed: cards,
    subjects: tasks.filter((k) => !k.parent_id), exams: exams.map((e) => ({ subjectId: e.task_id, days: daysUntil(e.date), name: e.name })),
  }), [sessions, tasks, exams, cards, cfg.goalMin, cfg.weeklyGoalMin]);
  if (sessions.length === 0) return null;
  const name = (id: number) => tasks.find((k) => k.id === id)?.name ?? (id === 0 ? 'Focus' : 'Deleted');
  const stat = (k: string, v: string) => <View style={{ minWidth: '45%', flexGrow: 1 }}><Txt v="label">{k}</Txt><Txt v="h3">{v}</Txt></View>;
  return (
    <Card style={{ marginHorizontal: space(4), gap: space(3) }}>
      <Txt v="label">Your week · last 7 days</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space(2) }}>
        <Txt v="h1">{fmtDur(r.cur)}</Txt>
        {r.delta != null && <Txt v="small" c={r.delta >= 0 ? t.success : t.danger}>{r.delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(r.delta * 100))}% vs last week</Txt>}
      </View>
      <Bar pct={r.goalPct} color={t.accentA} />
      <Txt v="small">{Math.round(r.goalPct * 100)}% of your weekly goal</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
        {stat('Active days', `${r.activeDays} / 7`)}
        {stat('Sessions', String(r.sessions))}
        {r.best && stat('Best day', `${fmtDate(r.best.key)} · ${fmtDur(r.best.ms)}`)}
        {r.top && stat('Most time', `${name(r.top.id)} · ${fmtDur(r.top.ms)}`)}
        {r.quality != null && stat('Focus quality', `${r.quality.toFixed(1)}${r.qualityPrev != null ? ` (was ${r.qualityPrev.toFixed(1)})` : ''}`)}
        {r.cardsReviewed > 0 && stat('Cards reviewed', String(r.cardsReviewed))}
        {r.pickups > 0 && stat('Phone pickups', String(r.pickups))}
      </View>
      <Txt>{r.suggestion}</Txt>
    </Card>
  );
}

/** This calendar week (Mon-Sun): overall goal plus any per-subject targets. */
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h3">All study</Txt><Txt v="small">{fmtDur(done)} / {fmtDur(goal)}</Txt></View>
        <Bar pct={done / goal} color={done >= goal ? t.success : t.accentA} />
      </View>
      {targets.map(({ k, ms }) => (
        <View key={k.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h3">{k.name}</Txt><Txt v="small">{fmtDur(ms)} / {fmtDur(k.weekly_goal_min * 60000)}</Txt></View>
          <Bar pct={ms / (k.weekly_goal_min * 60000)} color={ms >= k.weekly_goal_min * 60000 ? t.success : k.color} />
        </View>
      ))}
      {targets.length === 0 && <Txt v="small">Set a weekly target per subject in the Study tab.</Txt>}
    </Card>
  );
}

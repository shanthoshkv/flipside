import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, Heatmap, HourChart, Ring } from '../../components/charts';
import { Segmented } from '../../components/controls';
import { DatePicker } from '../../components/DatePicker';
import { GoalsCard, WeeklyReviewCard } from '../../components/WeekCards';
import { DayDetail } from '../../components/DayDetail';
import { Btn, Card, CountUp, EmptyState, Txt, tap } from '../../components/ui';
import type { Session, Task } from '../../db';
import { useData } from '../../data';
import { rootOf } from '../../components/TaskPicker';
import { bestDay, dailyTotals, hourDist, longestMs, perTask, sessionsIn, streaks, totalMs, WEEKDAY } from '../../stats';
import { useSettings } from '../../store';
import { font, radius, space, useTheme } from '../../theme';
import { addDays, fmtDate, fmtDur, startOfDay } from '../../util';

const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;

/** avg focus rating, best start hour, weakest subject (overall only) */
function quality(ss: Session[], tasks: Task[], overall: boolean) {
  const rated = ss.filter((s) => s.quality != null);
  if (!rated.length) return null;
  const avg = rated.reduce((n, s) => n + s.quality!, 0) / rated.length;
  const grp = (key: (s: Session) => number) => {
    const m = new Map<number, number[]>();
    for (const s of rated) m.set(key(s), [...(m.get(key(s)) ?? []), s.quality!]);
    return [...m].map(([k, v]) => ({ k, n: v.length, avg: v.reduce((a, b) => a + b, 0) / v.length }));
  };
  const hrs = grp((s) => new Date(s.start_ts).getHours()).filter((h) => h.n >= 2).sort((a, b) => b.avg - a.avg)[0];
  const subs = overall ? grp((s) => rootOf(tasks, s.task_id)).filter((x) => x.n >= 2).sort((a, b) => a.avg - b.avg) : [];
  return { avg, n: rated.length, bestHour: hrs?.k ?? null, bestAvg: hrs?.avg ?? 0, weak: subs.length > 1 ? { id: subs[0].k, avg: subs[0].avg } : null };
}

type Scope = 'all' | 'task';
type Range = '7' | '30' | 'all';

export default function Stats() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { sessions, tasks } = useData();
  const goal = useSettings((s) => s.goalMin) * 60000;
  const restDay = useSettings((s) => s.restDay);
  const [scope, setScope] = useState<Scope>('all');
  const [range, setRange] = useState<Range>('7');
  const [pick, setPick] = useState<number | null>(null);
  const [topic, setTopic] = useState<number | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);

  // subjects that have sessions (0 = no task); topics roll up into their subject
  const ids = useMemo(() => [...new Set(sessions.map((s) => rootOf(tasks, s.task_id)))], [sessions, tasks]);
  const known = (id: number) => tasks.find((k) => k.id === id);
  const nameOf = (id: number) => (id === 0 ? 'No task' : known(id)?.name ?? 'Deleted task');
  const colorOf = (id: number) => (id === 0 ? t.muted : known(id)?.color ?? t.accentA);
  const active = scope === 'task' ? (pick != null && ids.includes(pick) ? pick : ids[0] ?? 0) : null;

  const topics = active == null ? [] : tasks.filter((k) => k.parent_id === active);
  const d = useMemo(() => {
    const now = Date.now(), tomorrow = addDays(startOfDay(now), 1);
    const ss = active == null ? sessions : topic != null ? sessions.filter((s) => s.task_id === topic) : sessions.filter((s) => rootOf(tasks, s.task_id) === active);
    const days = dailyTotals(ss, now, 365);
    const from = range === 'all' ? 0 : addDays(startOfDay(now), -(Number(range) - 1));
    const inRange = sessionsIn(ss, from, tomorrow);
    const total = totalMs(ss, from, tomorrow);
    const activeDays = days.filter((x) => x.ts >= from && x.ms > 0).length;
    return {
      ss, days, today: days[364].ms, week: days.slice(-7), heat: days.slice(-105),
      streak: streaks(days, restDay), best: bestDay(days), hours: hourDist(ss),
      total, count: inRange.length, longest: longestMs(inRange), activeDays, avg: activeDays ? total / activeDays : 0,
      allTime: totalMs(ss, 0, Infinity),
      by: perTask(active == null ? sessions.map((s) => ({ ...s, task_id: rootOf(tasks, s.task_id) })) : ss, from, tomorrow),
      q: quality(ss, tasks, active == null),
    };
  }, [sessions, tasks, active, topic, range, restDay]);

  const pad = { marginHorizontal: space(4) };
  const byMax = d.by[0]?.[1] ?? 1;
  const tiles: [string, string][] = [
    ['Total', fmtDur(d.total)], ['Sessions', String(d.count)], ['Avg / active day', fmtDur(d.avg)],
    ['Longest', fmtDur(d.longest)], ['Streak', `${d.streak.current}d`], ['Best streak', `${d.streak.best}d`],
  ];

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(6), gap: space(4) }}>
      <Txt v="h1" style={{ paddingHorizontal: space(4) }}>Stats</Txt>

      {scope === 'all' && <WeeklyReviewCard />}
      {scope === 'all' && <GoalsCard />}

      <View style={[pad, { gap: space(3) }]}>
        <Segmented<Scope> value={scope} onChange={setScope} options={[{ v: 'all', label: 'Overall' }, { v: 'task', label: 'By task' }]} />
        {scope === 'task' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
            {ids.length === 0 && <Txt v="small">No tasks with sessions yet.</Txt>}
            {ids.map((id) => {
              const on = id === active;
              return (
                <Pressable key={id} accessibilityLabel={`Task ${nameOf(id)}`} onPress={() => { tap(); setPick(id); setTopic(null); }}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space(4), borderRadius: radius.pill,
                    backgroundColor: on ? colorOf(id) : t.surface, borderWidth: 1, borderColor: on ? colorOf(id) : t.border }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? '#1A1206' : colorOf(id) }} />
                  <Txt v="h3" c={on ? '#1A1206' : t.text}>{nameOf(id)}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {scope === 'task' && active != null && topics.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
            {[null, ...topics.map((k) => k.id)].map((id) => {
              const on = id === topic;
              return (
                <Pressable key={id ?? 'all'} onPress={() => { tap(); setTopic(id); }}
                  style={{ minHeight: 40, paddingHorizontal: space(4), borderRadius: radius.pill, justifyContent: 'center', backgroundColor: on ? colorOf(active) : t.surface2 }}>
                  <Txt v="small" c={on ? '#1A1206' : t.text} style={{ fontFamily: font.bodyBold }}>{id == null ? 'All topics' : known(id)?.name}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <Segmented<Range> value={range} onChange={setRange} options={[{ v: '7', label: '7 days' }, { v: '30', label: '30 days' }, { v: 'all', label: 'All time' }]} />
      </View>

      {sessions.length === 0 && <Card style={pad}><EmptyState title="No focus yet" hint="Flip your phone face-down on the Timer tab. Your first session shows up here." /></Card>}

      <Card i={0} style={[pad, { alignItems: 'center', gap: space(3) }]}>
        <Txt v="label">{active == null ? 'Today vs goal' : `${topic != null ? known(topic)?.name : nameOf(active)} today vs goal`}</Txt>
        <Ring progress={d.today / goal}>
          <CountUp value={d.today} format={fmtDur} style={{ fontFamily: font.headBold, fontSize: 32, color: t.text }} />
          <Txt v="small">of {fmtDur(goal)}</Txt>
        </Ring>
        <Txt v="small">All-time {active == null ? '' : `on ${topic != null ? known(topic)?.name : nameOf(active)} `}· {fmtDur(d.allTime)}</Txt>
      </Card>

      <View style={[pad, { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }]}>
        {tiles.map(([k, v], i) => (
          <Card key={k} i={i + 1} style={{ width: '31%', flexGrow: 1, padding: space(3) }}><Txt v="label" numberOfLines={1}>{k}</Txt><Txt v="h2">{v}</Txt></Card>
        ))}
      </View>

      <View style={pad}><Btn kind="ghost" label="Open any day" onPress={() => setPickOpen(true)} /></View>

      <Card i={4} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Last 7 days · tap a day</Txt>
        <BarChart onSelect={(i) => setDay(d.week[i].key)} goal={active == null ? goal : undefined} data={d.week.map((x, i) => ({ label: WEEKDAY[new Date(x.ts).getDay()], ms: x.ms, hot: i === 6 }))} />
      </Card>

      <Card i={5} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>15 weeks · tap a day</Txt>
        <Heatmap days={d.heat} onSelect={setDay} />
      </Card>

      <Card i={6} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Hour of day</Txt>
        <HourChart hours={d.hours} />
      </Card>

      {d.q && (
        <Card i={7} style={[pad, { gap: space(2) }]}>
          <Txt v="label">Focus quality</Txt>
          <Txt v="h2">{d.q.avg.toFixed(1)} / 5 <Txt v="small">· {d.q.n} rated</Txt></Txt>
          {d.q.bestHour != null && <Txt v="small">Best around {hourLabel(d.q.bestHour)} ({d.q.bestAvg.toFixed(1)} avg)</Txt>}
          {d.q.weak && <Txt v="small">Weakest subject: {nameOf(d.q.weak.id)} ({d.q.weak.avg.toFixed(1)} avg)</Txt>}
        </Card>
      )}

      {topic == null && (
        <Card i={8} style={[pad, { gap: space(3) }]}>
          <Txt v="label">{active == null ? 'By subject' : 'By topic'} · {range === 'all' ? 'all time' : `last ${range} days`}</Txt>
          {d.by.length === 0 && <Txt v="small">Nothing in this range.</Txt>}
          {d.by.map(([id, ms]) => (
            <Pressable key={id} onPress={() => { if (active == null) { tap(); setPick(id); setScope('task'); } }} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt v="h3">{active != null && id === active ? 'Whole subject' : active != null ? known(id)?.name ?? 'Deleted topic' : nameOf(id)}</Txt><Txt v="small">{fmtDur(ms)} · {Math.round((ms / (d.total || 1)) * 100)}%</Txt>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}>
                <View style={{ width: `${(ms / byMax) * 100}%`, height: 8, borderRadius: 4, backgroundColor: colorOf(active == null ? id : active) }} />
              </View>
            </Pressable>
          ))}
        </Card>
      )}

      {d.best && <Txt v="small" style={{ paddingHorizontal: space(4) }}>Best day: {fmtDate(d.best.key)} · {fmtDur(d.best.ms)}</Txt>}
      <Modal transparent animationType="fade" visible={pickOpen} onRequestClose={() => setPickOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }} onPress={() => setPickOpen(false)}>
          <Pressable style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(4), gap: space(3) }}>
            <Txt v="h2">Pick a day</Txt>
            <DatePicker allowPast value={day ?? ''} onChange={(k) => { setPickOpen(false); setDay(k); }} />
            <Btn kind="ghost" label="Close" onPress={() => setPickOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
      <DayDetail day={day} sessions={d.ss} tasks={tasks} onClose={() => setDay(null)} />
    </ScrollView>
  );
}

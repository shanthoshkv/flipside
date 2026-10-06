import { useMemo } from 'react';
import { View } from 'react-native';
import type { Session, Task } from '../db';
import { tr, weekdayLetter } from '../i18n';
import { dailyTotals, pieData, perTask, stackedDays, totalMs, weekdayAverage, weeklyTotals } from '../stats';
import { useSettings } from '../store';
import { categoryColors, space, useTheme } from '../theme';
import { addDays, fmtDur, startOfDay, startOfWeek } from '../util';
import { BarChart, HourChart } from './charts';
import { ContributionCalendar, DonutChart, LegendRow, StackedBars } from './charts2';
import { rootOf } from './TaskPicker';
import { Card, Txt } from './ui';

interface Props {
  ss: Session[]; tasks: Task[]; active: number | null; topic: number | null; range: '7' | '30' | 'all';
  goal: number; hours: number[]; onDay: (key: string) => void;
}

/** The "more charts" part of Stats: pie, stacked days, 30 days, 12 weeks, weekdays, hours, year calendar. */
export function StatsCharts({ ss, tasks, active, topic, range, goal, hours, onDay }: Props) {
  const t = useTheme(), weekStart = useSettings((s) => s.weekStart);
  const m = useMemo(() => {
    const now = Date.now(), today = startOfDay(now), to = addDays(today, 1);
    const from = range === 'all' ? 0 : addDays(today, -(Number(range) - 1));
    const sub = active != null; // inside one subject the pie and stacks split by topic
    const mapId = (id: number) => (sub ? id : rootOf(tasks, id));
    const entries = perTask(sub ? ss : ss.map((s) => ({ ...s, task_id: mapId(s.task_id) })), from, to);
    const order = entries.map(([id]) => id);
    const days = dailyTotals(ss, now, 371);
    const wk = weekStart === 'sun' ? 0 : 1;
    const dayOrder = wk === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
    const avg = weekdayAverage(ss, now, 12);
    return {
      entries, order, mapId, days, total: entries.reduce((n, [, v]) => n + v, 0),
      stacked: stackedDays(ss, addDays(today, -6), 7, mapId),
      d30: days.slice(-30),
      w12: weeklyTotals(ss, startOfWeek(now), 12),
      wdays: dayOrder.map((d) => ({ label: weekdayLetter(d), ms: avg[d] })),
      year: days.reduce((n, d) => n + d.ms, 0), activeDays: days.filter((d) => d.ms > 0).length,
      week: totalMs(ss, startOfWeek(now), to),
    };
  }, [ss, tasks, active, range, weekStart]);

  const known = (id: number) => tasks.find((k) => k.id === id);
  const nameOf = (id: number) => (id === -1 ? tr('Other') : id === 0 ? tr('No task') : known(id)?.name ?? tr('Deleted task'));
  const colorOf = (id: number) => {
    if (id === -1 || id === 0) return t.muted;
    if (active == null) return known(id)?.color ?? t.accentA;
    const i = m.order.indexOf(id);
    return i < 0 ? t.muted : categoryColors[i % categoryColors.length];
  };
  const pie = pieData(m.entries, 7);
  const slices = pie.map((p) => ({ color: colorOf(p.id), ms: p.ms }));
  const pad = { marginHorizontal: space(4) };
  const dayLetter = (ts: number) => weekdayLetter(new Date(ts).getDay());
  const lastIdx = (n: number) => n - 1;
  const legendIds = [...new Set(m.stacked.flatMap((d) => d.parts.map((p) => p[0])))];

  return (
    <>
      {topic == null && pie.length > 0 && (
        <Card i={0} style={[pad, { gap: space(3) }]}>
          <Txt v="label" raw>{`${tr(active == null ? 'Time by subject' : 'Time by topic')} · ${range === 'all' ? tr('All time') : tr('Last {n} days', { n: range })}`}</Txt>
          <View style={{ alignItems: 'center' }}>
            <DonutChart slices={slices} center={fmtDur(m.total)} sub={tr('{n} studied', { n: pie.length })} />
          </View>
          {pie.map((p) => <LegendRow key={p.id} color={colorOf(p.id)} name={nameOf(p.id)} ms={p.ms} pct={Math.round((p.ms / (m.total || 1)) * 100)} />)}
        </Card>
      )}

      <Card i={1} style={[pad, { gap: space(3) }]}>
        <Txt v="label">{active == null ? 'Last 7 days by subject' : 'Last 7 days by topic'}</Txt>
        <StackedBars colorOf={colorOf} onSelect={(i) => onDay(m.stacked[i].key)}
          days={m.stacked.map((d) => ({ label: dayLetter(d.ts), ms: d.ms, parts: d.parts }))} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
          {legendIds.map((id) => (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colorOf(id) }} /><Txt v="small" raw>{nameOf(id)}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <Card i={2} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Last 30 days</Txt>
        <BarChart height={130} onSelect={(i) => onDay(m.d30[i].key)}
          data={m.d30.map((d, i) => ({ label: i % 5 === 4 ? String(new Date(d.ts).getDate()) : '', ms: d.ms, hot: i === lastIdx(m.d30.length) }))} />
      </Card>

      <Card i={3} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Last 12 weeks</Txt>
        <BarChart height={130} goal={active == null ? goal * 7 : undefined}
          data={m.w12.map((w, i) => ({ label: i % 2 === 1 ? String(new Date(w.ts).getDate()) : '', ms: w.ms, hot: i === 11 }))} />
        <Txt v="small" style={{ marginTop: space(2) }} raw>{`${tr('This week')}: ${fmtDur(m.week)}`}</Txt>
      </Card>

      <Card i={4} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Average per weekday</Txt>
        <BarChart height={120} data={m.wdays} />
      </Card>

      <Card i={5} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Hour of day</Txt>
        <HourChart hours={hours} />
      </Card>

      <Card i={6} style={[pad, { gap: space(2) }]}>
        <Txt v="label">Focus calendar · last year</Txt>
        <Txt v="small" raw>{tr('{t} across {n} days', { t: fmtDur(m.year), n: m.activeDays })}</Txt>
        <ContributionCalendar days={m.days} startDay={weekStart === 'sun' ? 0 : 1} onSelect={onDay} />
      </Card>
    </>
  );
}

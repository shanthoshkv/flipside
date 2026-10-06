import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, Heatmap, HourChart, Ring } from '../../components/charts';
import { Card, CountUp, EmptyState, Txt } from '../../components/ui';
import { useData } from '../../data';
import { bestDay, dailyTotals, hourDist, perTask, streaks, WEEKDAY } from '../../stats';
import { useSettings } from '../../store';
import { font, space, useTheme } from '../../theme';
import { addDays, fmtDur, keyToTs, startOfDay } from '../../util';

export default function Stats() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { sessions, tasks } = useData();
  const goal = useSettings((s) => s.goalMin) * 60000;
  const d = useMemo(() => {
    const now = Date.now(), days = dailyTotals(sessions, now, 105);
    return {
      days, week: days.slice(-7), today: days[104].ms, streak: streaks(days), best: bestDay(days),
      hours: hourDist(sessions), tasks: perTask(sessions, addDays(startOfDay(now), -104), now + 86400000),
    };
  }, [sessions]);

  const taskMax = d.tasks[0]?.[1] ?? 1;
  const empty = sessions.length === 0;
  const pad = { marginHorizontal: space(4) };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingTop: top + space(2), paddingBottom: space(6), gap: space(4) }}>
      <Txt v="h1" style={{ paddingHorizontal: space(4) }}>Stats</Txt>
      {empty && <Card style={pad}><EmptyState title="No focus yet" hint="Flip your phone face-down on the Timer tab. Your first session shows up here." /></Card>}

      <Card i={0} style={[pad, { alignItems: 'center', gap: space(3) }]}>
        <Txt v="label">Today vs goal</Txt>
        <Ring progress={d.today / goal}>
          <CountUp value={d.today} format={fmtDur} style={{ fontFamily: font.headBold, fontSize: 32, color: t.text }} />
          <Txt v="small">of {fmtDur(goal)}</Txt>
        </Ring>
      </Card>

      <View style={[pad, { flexDirection: 'row', gap: space(3) }]}>
        {[['Streak', `${d.streak.current}d`], ['Best streak', `${d.streak.best}d`], ['Best day', d.best ? fmtDur(d.best.ms) : '–']].map(([k, v], i) => (
          <Card key={k} i={i + 1} style={{ flex: 1, padding: space(3) }}><Txt v="label">{k}</Txt><Txt v="h2">{v}</Txt></Card>
        ))}
      </View>

      <Card i={4} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Last 7 days</Txt>
        <BarChart goal={goal} data={d.week.map((x, i) => ({ label: WEEKDAY[new Date(x.ts).getDay()], ms: x.ms, hot: i === 6 }))} />
      </Card>

      <Card i={5} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>15 weeks</Txt>
        <Heatmap days={d.days} />
      </Card>

      <Card i={6} style={pad}>
        <Txt v="label" style={{ marginBottom: space(3) }}>Hour of day</Txt>
        <HourChart hours={d.hours} />
      </Card>

      <Card i={7} style={[pad, { gap: space(3) }]}>
        <Txt v="label">By task</Txt>
        {d.tasks.length === 0 && <Txt v="small">Nothing yet.</Txt>}
        {d.tasks.map(([id, ms]) => {
          const k = tasks.find((x) => x.id === id);
          return (
            <View key={id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Txt v="h3">{k?.name ?? 'Deleted task'}</Txt><Txt v="small">{fmtDur(ms)}</Txt></View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}>
                <View style={{ width: `${(ms / taskMax) * 100}%`, height: 8, borderRadius: 4, backgroundColor: k?.color ?? t.accentA }} />
              </View>
            </View>
          );
        })}
        {d.best && <Txt v="small">Best day: {new Date(keyToTs(d.best.key)).toDateString()}</Txt>}
      </Card>
    </ScrollView>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { plansBetween, type Session } from '../db';
import { tr } from '../i18n';
import { dailyTotals, focusScore, hourWeekGrid, movingAvg, sessionsIn, totalMs } from '../stats';
import { useSettings } from '../store';
import { space, useTheme } from '../theme';
import { addDays, dayKey, fmtDur, startOfDay, startOfWeek } from '../util';
import { HourWeekHeat, TrendChart } from './charts3';
import { Card, Txt } from './ui';

/** Focus score, week-over-week, plan vs actual, 60-day trend, weekday × hour heat. */
export function Insights({ ss }: { ss: Session[] }) {
  const t = useTheme(), weekStart = useSettings((s) => s.weekStart);
  const [planned, setPlanned] = useState(0);
  const m = useMemo(() => {
    const now = Date.now(), wk = startOfWeek(now), to = addDays(startOfDay(now), 1);
    const days = dailyTotals(ss, now, 60).map((d) => d.ms);
    const cur = totalMs(ss, wk, to), prev = totalMs(ss, addDays(wk, -7), addDays(wk, -7) + (to - wk));
    return {
      wk, cur, prev, days, avg: movingAvg(days, 7),
      score: focusScore(sessionsIn(ss, addDays(startOfDay(now), -29), to)), scorePrev: focusScore(sessionsIn(ss, addDays(startOfDay(now), -59), addDays(startOfDay(now), -29))),
      grid: hourWeekGrid(ss),
    };
  }, [ss]);
  useEffect(() => { plansBetween(dayKey(m.wk), dayKey(addDays(m.wk, 6))).then((p) => setPlanned(p.length * 600000)).catch(() => {}); }, [m.wk, ss]);

  const delta = m.prev ? Math.round(((m.cur - m.prev) / m.prev) * 100) : null;
  const order = weekStart === 'sun' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
  const pad = { marginHorizontal: space(4), gap: space(2) };
  const Tile = ({ k, v, sub, c }: { k: string; v: string; sub?: string; c?: string }) => (
    <Card style={{ flex: 1, padding: space(3) }}><Txt v="label" numberOfLines={1}>{k}</Txt><Txt v="h2" raw c={c}>{v}</Txt>{!!sub && <Txt v="small" raw>{sub}</Txt>}</Card>
  );

  return (
    <>
      <View style={{ marginHorizontal: space(4), flexDirection: 'row', gap: space(3) }}>
        <Tile k="Focus score" v={m.score == null ? '–' : String(m.score)} sub={m.score != null && m.scorePrev != null ? tr('{n} vs prior 30d', { n: `${m.score >= m.scorePrev ? '+' : ''}${m.score - m.scorePrev}` }) : tr('Last 30 days')} />
        <Tile k="vs last week" v={delta == null ? '–' : `${delta >= 0 ? '+' : ''}${delta}%`} c={delta == null ? undefined : delta >= 0 ? t.success : t.danger} sub={fmtDur(m.cur)} />
      </View>
      {planned > 0 && (
        <Card style={pad}>
          <Txt v="label">Plan vs actual · this week</Txt>
          <Txt v="h3" raw>{`${fmtDur(m.cur)} / ${fmtDur(planned)}`}</Txt>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }}>
            <View style={{ width: `${Math.min(100, (m.cur / planned) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: m.cur >= planned ? t.success : t.accentA }} />
          </View>
        </Card>
      )}
      <Card style={pad}>
        <Txt v="label">Trend · 60 days, 7-day average</Txt>
        <TrendChart values={m.days} avg={m.avg} />
        <Txt v="small" raw>{tr('Average now: {t}/day', { t: fmtDur(m.avg[m.avg.length - 1] ?? 0) })}</Txt>
      </Card>
      <Card style={pad}>
        <Txt v="label">Best hours</Txt>
        <HourWeekHeat grid={m.grid} order={order} />
      </Card>
    </>
  );
}

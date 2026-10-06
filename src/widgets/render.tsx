import { FlexWidget, SvgWidget, TextWidget, type ColorProp } from 'react-native-android-widget';
import { listTasks, migrate, sessionsBetween, getSettings } from '../db';
import { dailyTotals, streaks, totalMs, WEEKDAY } from '../stats';
import { addDays, fmtDur, startOfDay } from '../util';

const C: Record<string, ColorProp> = { bg: '#14141C', surface2: '#1C1C27', text: '#F4F4F8', muted: '#8B8BA0', a: '#FFB547', b: '#FF6B6B' };

async function snapshot() {
  await migrate();
  const now = Date.now();
  const [ss, st, tasks] = await Promise.all([sessionsBetween(addDays(startOfDay(now), -60), now + 86400000), getSettings(), listTasks()]);
  const days = dailyTotals(ss, now, 7);
  const goalMin: number = st.goalMin ? JSON.parse(st.goalMin) : 240;
  const lastId: number | null = st.lastTaskId ? JSON.parse(st.lastTaskId) : null;
  const task = lastId === 0 ? null : tasks.find((t) => t.id === lastId) ?? tasks[0] ?? null;
  const all = dailyTotals(ss, now, 60);
  return {
    todayMs: days[6].ms, goalMs: goalMin * 60000, streak: streaks(all, st.restDay ? JSON.parse(st.restDay) : true).current, days, task,
    taskMs: task ? totalMs(ss.filter((s) => s.task_id === task.id), addDays(startOfDay(now), -6), now + 86400000) : 0,
  };
}

const ring = (pct: number) => {
  const r = 42, c = 2 * Math.PI * r, p = Math.min(1, pct);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 110 110"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.a}"/><stop offset="1" stop-color="${C.b}"/></linearGradient></defs><circle cx="55" cy="55" r="${r}" fill="none" stroke="${C.surface2}" stroke-width="10"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c * p} ${c}" transform="rotate(-90 55 55)"/></svg>`;
};

const bars = (vals: number[], w: number, h: number) => {
  const max = Math.max(...vals, 1), bw = w / vals.length;
  const rects = vals.map((v, i) => {
    const bh = Math.max(4, (v / max) * (h - 16));
    return `<rect x="${i * bw + 4}" y="${h - bh}" width="${bw - 8}" height="${bh}" rx="5" fill="${i === vals.length - 1 ? C.b : C.a}" opacity="${v > 0 ? 1 : 0.25}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rects}</svg>`;
};

const Box = ({ children, uri }: { children: any; uri?: string }) => (
  <FlexWidget
    clickAction={uri ? 'OPEN_URI' : 'OPEN_APP'} clickActionData={uri ? { uri } : undefined}
    style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.bg, borderRadius: 24, padding: 12 }}
  >{children}</FlexWidget>
);

export async function renderWidget(name: string, width: number) {
  const s = await snapshot();
  if (name === 'QuickStart') {
    return (
      <Box uri={`flipside://timer?task=${s.task?.id ?? 0}`}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 'match_parent' }}>
          <FlexWidget style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: (s.task?.color as ColorProp) ?? C.b, marginRight: 12 }} />
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget text={s.task?.name ?? 'Focus'} style={{ fontSize: 16, fontWeight: '700', color: C.text }} maxLines={1} />
            <TextWidget text={`Tap to flip-start · today ${fmtDur(s.todayMs)}`} style={{ fontSize: 12, color: C.muted }} maxLines={1} />
          </FlexWidget>
        </FlexWidget>
      </Box>
    );
  }
  if (name === 'Week') {
    return (
      <Box>
        <TextWidget text={`This week · ${fmtDur(s.days.reduce((n, d) => n + d.ms, 0))}${s.task ? `  ·  ${s.task.name} ${fmtDur(s.taskMs)}` : ''}`} style={{ fontSize: 13, fontWeight: '700', color: C.text }} maxLines={1} />
        <SvgWidget svg={bars(s.days.map((d) => d.ms), Math.max(200, width - 24), 70)} style={{ height: 70, width: 'match_parent', marginTop: 8 }} />
        <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', marginTop: 4 }}>
          {s.days.map((d, i) => (
            <TextWidget key={i} text={WEEKDAY[new Date(d.ts).getDay()]} style={{ fontSize: 11, color: C.muted, textAlign: 'center', width: Math.max(200, width - 24) / 7 }} />
          ))}
        </FlexWidget>
      </Box>
    );
  }
  return (
    <Box>
      <FlexWidget style={{ alignItems: 'center', width: 'match_parent', height: 'match_parent' }}>
        <SvgWidget svg={ring(s.todayMs / s.goalMs)} style={{ width: 84, height: 84 }} />
        <TextWidget text={fmtDur(s.todayMs)} style={{ fontSize: 16, fontWeight: '700', color: C.text }} />
        <TextWidget text={`🔥 ${s.streak}d streak`} style={{ fontSize: 11, color: C.muted }} />
      </FlexWidget>
    </Box>
  );
}

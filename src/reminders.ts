import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useData } from './data';
import { tr } from './i18n';
import { plansBetween } from './db';
import { blockTimes, inQuiet, nextSundays, planBlocks } from './remindCore';
import { dailyTotals, streaks } from './stats';
import { useSettings } from './store';
import { addDays, dayKey, startOfDay } from './util';

const PREFIX = 'rm-';
let timer: ReturnType<typeof setTimeout> | null = null;

const at = (id: string, when: number, title: string, body: string) =>
  Notifications.scheduleNotificationAsync({
    identifier: PREFIX + id, content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when), channelId: 'default' },
  });

/** Cancel every reminder we own and schedule the next week again. Safe to call often. */
export async function syncReminders() {
  if (Platform.OS !== 'android') return;
  try {
    const old = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(old.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    const cfg = useSettings.getState();
    if (!cfg.remindPlan && !cfg.remindStreak && !cfg.remindWeekly) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;

    const now = Date.now(), quiet = { start: cfg.quietStart, end: cfg.quietEnd };
    const { tasks, sessions } = useData.getState();
    const name = (id: number) => {
      const k = tasks.find((x) => x.id === id);
      const p = k?.parent_id ? tasks.find((x) => x.id === k.parent_id) : null;
      return k ? (p ? `${p.name} › ${k.name}` : k.name) : tr('Focus');
    };

    if (cfg.remindPlan) {
      const today = startOfDay(now);
      const plans = await plansBetween(dayKey(today), dayKey(addDays(today, 7)));
      for (const b of blockTimes(planBlocks(plans), now, 10, quiet).slice(0, 40)) {
        await at(`plan-${b.date}-${b.startSlot}`, b.at, tr('Study block in 10 minutes'), name(b.taskId));
      }
    }

    if (cfg.remindStreak) {
      const days = dailyTotals(sessions, now, 120), run = streaks(days, cfg.restDay).current;
      const body = run > 0 ? tr('Keep your {n}-day streak. Ten minutes counts.', { n: run }) : tr('A short session keeps the habit going.');
      for (let i = 0; i < 7; i++) {
        const day = addDays(startOfDay(now), i), when = day + 20 * 3600000;
        if (when <= now || inQuiet(20, quiet.start, quiet.end) || (i === 0 && days[days.length - 1].ms > 0)) continue;
        await at(`streak-${dayKey(day)}`, when, tr('No focus yet today'), body);
      }
    }

    if (cfg.remindWeekly) {
      for (const when of nextSundays(now, 19, 2)) {
        if (!inQuiet(19, quiet.start, quiet.end)) await at(`weekly-${dayKey(when)}`, when, tr('Your week in review'), tr('See how this week went in Stats.'));
      }
    }
  } catch {
    // reminders are best-effort; never break the app
  }
}

export function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(syncReminders, 1500);
}

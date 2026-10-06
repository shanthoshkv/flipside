import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { insertSession, updateSession, type Session, type Task } from '../db';
import { useData } from '../data';
import { font, radius, space, useTheme } from '../theme';
import { addDays, fmtDate, keyToTs, pad2 } from '../util';
import { TaskPicker } from './TaskPicker';
import { Btn, Txt, tap } from './ui';

const fmtMin = (m: number) => `${pad2(Math.floor((m % 1440) / 60))}:${pad2(m % 60)}${m >= 1440 ? ' (+1d)' : ''}`;

function TimeRow({ label, value, onChange }: { label: string; value: number; onChange: (m: number) => void }) {
  const t = useTheme();
  const B = ({ d, s }: { d: number; s: string }) => (
    <Pressable accessibilityLabel={`${label} ${d < 0 ? 'earlier' : 'later'} by ${Math.abs(d)} minutes`} onPress={() => { tap(); onChange(Math.max(0, Math.min(2879, value + d))); }}
      style={{ minWidth: 48, height: 48, borderRadius: 24, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
      <Txt v="small" c={t.text} style={{ fontFamily: font.bodyBold }}>{s}</Txt>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
      <Txt style={{ width: 44 }}>{label}</Txt>
      <B d={-60} s="-1h" /><B d={-5} s="-5" />
      <Txt v="h3" style={{ minWidth: 92, textAlign: 'center' }}>{fmtMin(value)}</Txt>
      <B d={5} s="+5" /><B d={60} s="+1h" />
    </View>
  );
}

/** Edit an existing session, or add a manual one, on `day`. Times are offsets from that day's midnight. */
export function SessionEditor({ day, session, tasks, onDone }: { day: string; session: Session | null; tasks: Task[]; onDone: () => void }) {
  const t = useTheme();
  const base = keyToTs(day), now = Date.now();
  const nowMin = Math.floor((now - base) / 60000 / 5) * 5;
  const [task, setTask] = useState(session?.task_id ?? 0);
  const [start, setStart] = useState(session ? Math.round((session.start_ts - base) / 60000) : nowMin > 0 && nowMin < 1440 ? Math.max(0, nowMin - 30) : 540);
  const [end, setEnd] = useState(session ? Math.round(((session.end_ts ?? session.heartbeat_ts ?? session.start_ts) - base) / 60000) : nowMin > 0 && nowMin < 1440 ? nowMin : 600);
  const [q, setQ] = useState<number | null>(session?.quality ?? null);
  const [note, setNote] = useState(session?.note ?? '');
  const startTs = addDays(base, 0) + start * 60000, endTs = base + end * 60000;
  const err = end - start < 1 ? 'End must be after start.' : endTs > now ? 'End is in the future.' : '';

  const save = async () => {
    if (err) return;
    if (session) await updateSession(session.id, task, startTs, endTs, q, note.trim());
    else await insertSession(task, startTs, endTs, q, note.trim());
    await useData.getState().reload();
    onDone();
  };

  return (
    <View style={{ gap: space(3) }}>
      <Txt v="h2">{session ? 'Edit session' : 'Add session'} · {fmtDate(day)}</Txt>
      <TaskPicker tasks={tasks} selected={task} onSelect={setTask} />
      <TimeRow label="Start" value={start} onChange={setStart} />
      <TimeRow label="End" value={end} onChange={setEnd} />
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} accessibilityLabel={`Focus quality ${n}`} accessibilityState={{ selected: q === n }} onPress={() => { tap(); setQ(q === n ? null : n); }}
            style={{ flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: q === n ? t.accentA : t.surface2 }}>
            <Txt v="h3" c={q === n ? '#1A1206' : t.text}>{n}</Txt>
          </Pressable>
        ))}
      </View>
      <TextInput value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={t.muted} multiline
        style={{ minHeight: 56, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, padding: space(3), fontFamily: font.body, fontSize: 15, textAlignVertical: 'top' }} />
      {!!err && <Txt v="small" c={t.danger}>{err}</Txt>}
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <Btn kind="ghost" label="Cancel" onPress={onDone} style={{ flex: 1 }} />
        <Btn label="Save" onPress={save} disabled={!!err} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

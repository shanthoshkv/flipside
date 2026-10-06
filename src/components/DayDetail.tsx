import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { deleteSession, getDiary, type Diary, type Session, type Task } from '../db';
import { useData } from '../data';
import { radius, space, useTheme } from '../theme';
import { addDays, fmtDate, fmtDur, keyToTs, pad2 } from '../util';
import { SessionEditor } from './SessionEditor';
import { Btn, Txt, tap } from './ui';

const hm = (ts: number) => `${pad2(new Date(ts).getHours())}:${pad2(new Date(ts).getMinutes())}`;
const FACE = ['', 'Rough', 'Meh', 'Okay', 'Good', 'Deep'];

/** One day: sessions with quality + notes (edit, delete, add) and the three-line diary. */
export function DayDetail({ day, sessions, tasks, onClose }: { day: string | null; sessions: Session[]; tasks: Task[]; onClose: () => void }) {
  const t = useTheme();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [edit, setEdit] = useState<{ s: Session | null } | null>(null);
  useEffect(() => { setDiary(null); setEdit(null); if (day) getDiary(day).then(setDiary); }, [day]);
  if (!day) return null;

  const a = keyToTs(day), b = addDays(a, 1);
  const list = sessions.filter((s) => s.start_ts < b && (s.end_ts ?? s.heartbeat_ts ?? s.start_ts) > a).sort((x, y) => x.start_ts - y.start_ts);
  const total = list.reduce((n, s) => n + Math.max(0, Math.min(s.end_ts ?? s.heartbeat_ts ?? s.start_ts, b) - Math.max(s.start_ts, a)), 0);
  const pickups = list.reduce((n, s) => n + (s.breaks ?? 0), 0);
  const name = (id: number) => {
    const k = tasks.find((x) => x.id === id);
    if (!k) return id === 0 ? 'Focus' : 'Deleted task';
    const p = k.parent_id ? tasks.find((x) => x.id === k.parent_id) : null;
    return p ? `${p.name} › ${k.name}` : k.name;
  };
  const lines = diary ? [diary.l1, diary.l2, diary.l3].filter(Boolean) : [];
  const del = (s: Session) => Alert.alert('Delete this session?', 'This removes its time from your stats.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSession(s.id); await useData.getState().reload(); } },
  ]);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }} onPress={onClose}>
        <Pressable style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(5), gap: space(3), maxHeight: '88%' }}>
          {edit ? (
            <ScrollView keyboardShouldPersistTaps="handled">
              <SessionEditor day={day} session={edit.s} tasks={tasks} onDone={() => setEdit(null)} />
            </ScrollView>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Txt v="h2">{fmtDate(day)}</Txt><Txt v="h3" c={t.accentText}>{fmtDur(total)}</Txt>
              </View>
              {pickups > 0 && <Txt v="small">Phone pickups mid-session: {pickups}</Txt>}
              <ScrollView contentContainerStyle={{ gap: space(3) }}>
                {list.length === 0 && <Txt v="small">No focus sessions this day.</Txt>}
                {list.map((s) => {
                  const e = s.end_ts ?? s.heartbeat_ts ?? s.start_ts;
                  return (
                    <View key={s.id} style={{ backgroundColor: t.surface2, borderRadius: radius.md, padding: space(3), gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Txt v="h3" style={{ flex: 1 }}>{name(s.task_id)}</Txt><Txt v="small">{fmtDur(e - s.start_ts)}</Txt>
                      </View>
                      <Txt v="small">{hm(s.start_ts)} – {hm(e)}{s.quality ? ` · focus ${s.quality}/5 ${FACE[s.quality]}` : ''}{s.breaks ? ' · paused' : ''}{s.mode === 'manual' ? ' · added by hand' : ''}</Txt>
                      {!!s.note && <Txt>{s.note}</Txt>}
                      {s.end_ts != null && (
                        <View style={{ flexDirection: 'row', gap: space(2), marginTop: 4 }}>
                          <Pressable accessibilityLabel="Edit session" onPress={() => { tap(); setEdit({ s }); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space(2) }}><Txt v="h3" c={t.accentText}>Edit</Txt></Pressable>
                          <Pressable accessibilityLabel="Delete session" onPress={() => del(s)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space(2) }}><Txt v="h3" c={t.danger}>Delete</Txt></Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
                {lines.length > 0 && (
                  <View style={{ gap: 4 }}>
                    <Txt v="label">Three lines</Txt>
                    {lines.map((l, i) => <Txt key={i}>• {l}</Txt>)}
                  </View>
                )}
              </ScrollView>
              <Btn kind="ghost" label="+ Add session" onPress={() => setEdit({ s: null })} />
              <Btn kind="ghost" label="Close" onPress={onClose} />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

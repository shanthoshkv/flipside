import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rootOf } from '../components/TaskPicker';
import { Btn, Txt, tap } from '../components/ui';
import { saveReview, type Card } from '../db';
import { useData } from '../data';
import { GRADES, isDue, previews, schedule, type Grade } from '../engine/srs';
import { font, radius, space, useTheme } from '../theme';

/** Review queue of due cards. "Again" cards go to the back of the queue and come round again this session. */
export default function Review() {
  const t = useTheme(), { top, bottom } = useSafeAreaInsets();
  const { task } = useLocalSearchParams<{ task?: string }>();
  const { cards, tasks, reload } = useData();
  const [queue, setQueue] = useState<Card[]>(() => {
    const now = Date.now();
    return cards.filter((c) => isDue(c, now) && (task === undefined || rootOf(tasks, c.task_id) === Number(task))).sort((a, b) => a.due - b.due);
  });
  const [show, setShow] = useState(false);
  const stats = useRef({ done: 0, again: 0 });
  const total = useRef(queue.length);
  useEffect(() => () => { reload(); }, []);

  const cur = queue[0];
  const now = Date.now();
  const prev = useMemo(() => (cur ? previews(cur, now) : []), [cur?.id, show]);
  const label = (c: Card) => (c.task_id === 0 ? '' : tasks.find((k) => k.id === c.task_id)?.name ?? '');

  const grade = async (g: Grade) => {
    if (!cur) return;
    const ts = Date.now(), next = schedule(cur, g, ts);
    await saveReview(cur.id, next, g, ts);
    stats.current.done++;
    if (g === 0) stats.current.again++;
    setShow(false);
    setQueue((q) => (g === 0 ? [...q.slice(1), { ...cur, ...next, last_review: ts }] : q.slice(1)));
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2), paddingBottom: bottom + space(3), paddingHorizontal: space(4), gap: space(4) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center' }}><Txt v="h3" c={t.accentA}>‹ Back</Txt></Pressable>
        <Txt v="label">{cur ? `${queue.length} left` : 'Done'}</Txt>
      </View>

      {cur ? (
        <>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface2 }}>
            <View style={{ width: `${(stats.current.done / Math.max(1, stats.current.done + queue.length)) * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.accentA }} />
          </View>
          <Pressable disabled={show} onPress={() => { tap(); setShow(true); }} style={{ flex: 1, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space(5), justifyContent: 'center', gap: space(4) }}>
              {!!label(cur) && <Txt v="label" style={{ textAlign: 'center' }}>{label(cur)}</Txt>}
              <Txt style={{ fontFamily: font.head, fontSize: 26, textAlign: 'center' }}>{cur.front}</Txt>
              {show && (
                <>
                  <View style={{ height: 1, backgroundColor: t.border }} />
                  <Txt style={{ fontSize: 20, textAlign: 'center', lineHeight: 28 }}>{cur.back}</Txt>
                </>
              )}
              {!show && <Txt v="small" style={{ textAlign: 'center' }}>Tap to show answer</Txt>}
            </ScrollView>
          </Pressable>
          {show ? (
            <View style={{ flexDirection: 'row', gap: space(2) }}>
              {GRADES.map((n, i) => (
                <Pressable key={n} accessibilityLabel={`${n}, next in ${prev[i]}`} onPress={() => { tap(); grade(i as Grade); }}
                  style={{ flex: 1, minHeight: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: [t.accentB, t.surface2, t.accentA, t.success][i] }}>
                  <Txt v="h3" c={i === 1 ? t.text : '#1A1206'}>{n}</Txt>
                  <Txt v="small" c={i === 1 ? t.muted : '#1A1206'}>{prev[i]}</Txt>
                </Pressable>
              ))}
            </View>
          ) : <Btn label="Show answer" onPress={() => setShow(true)} />}
        </>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(3) }}>
          <Txt v="h1">{total.current === 0 ? 'Nothing due' : 'All done'}</Txt>
          <Txt v="small" style={{ textAlign: 'center' }}>
            {total.current === 0 ? 'Come back when cards are due, or add more.' : `${stats.current.done} reviews · ${stats.current.again} to relearn`}
          </Txt>
          <Btn label="Back" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

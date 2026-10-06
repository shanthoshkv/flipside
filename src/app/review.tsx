import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rootOf } from '../components/TaskPicker';
import { Btn, Txt, tap } from '../components/ui';
import { newIntroducedSince, reviewedSince, saveReview, type Card } from '../db';
import { useData } from '../data';
import { GRADES, buildQueue, previews, schedule, type Grade } from '../engine/srs';
import { tr } from '../i18n';
import { useSettings } from '../store';
import { font, radius, space, useTheme } from '../theme';
import { startOfDay } from '../util';
import { withBoundary } from '../components/ErrorBoundary';

/** Review queue: due reviews then new cards (daily limits apply). "Again" cards return later this session. */
function Review() {
  const t = useTheme(), { top, bottom } = useSafeAreaInsets();
  const { task } = useLocalSearchParams<{ task?: string }>();
  const { cards, tasks, reload } = useData();
  const cfg = useSettings();
  const algo = cfg.scheduler, retention = cfg.retention / 100;
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [show, setShow] = useState(false);
  const stats = useRef({ done: 0, again: 0 });
  const total = useRef(0);
  useEffect(() => () => { reload(); }, []);

  useEffect(() => {
    const s = startOfDay(Date.now());
    Promise.all([reviewedSince(s), newIntroducedSince(s)]).then(([reviewsToday, newToday]) => {
      const pool = cards.filter((c) => task === undefined || rootOf(tasks, c.task_id) === Number(task));
      const q = buildQueue(pool, Date.now(), cfg, { reviewsToday, newToday });
      total.current = q.length;
      setQueue(q);
    });
  }, []);

  const cur = queue?.[0];
  const prev = useMemo(() => (cur ? previews(cur, Date.now(), algo, retention) : []), [cur?.id, show]);
  const label = (c: Card) => (c.task_id === 0 ? '' : tasks.find((k) => k.id === c.task_id)?.name ?? '');

  const grade = async (g: Grade) => {
    if (!cur) return;
    const ts = Date.now(), next = schedule(cur, g, ts, algo, retention);
    await saveReview(cur.id, next, g, ts);
    stats.current.done++;
    if (g === 0) stats.current.again++;
    setShow(false);
    setQueue((q) => (q ? (g === 0 ? [...q.slice(1), { ...cur, ...next, last_review: ts }] : q.slice(1)) : q));
  };

  const Pic = ({ uri }: { uri: string | null }) => (uri ? <Image source={{ uri }} contentFit="contain" style={{ width: '100%', height: 200 }} accessibilityLabel="Card image" /> : null);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2), paddingBottom: bottom + space(3), paddingHorizontal: space(4), gap: space(4) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center' }}><Txt v="h3" c={t.accentText}>‹ Back</Txt></Pressable>
        <Txt v="label">{queue === null ? '' : cur ? tr('{n} left', { n: queue.length }) : 'Done'}</Txt>
      </View>

      {queue === null ? null : cur ? (
        <>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface2 }}>
            <View style={{ width: `${(stats.current.done / Math.max(1, stats.current.done + queue.length)) * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.accentA }} />
          </View>
          <Pressable disabled={show} onPress={() => { tap(); setShow(true); }} style={{ flex: 1, backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: t.border }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, padding: space(5), justifyContent: 'center', gap: space(4) }}>
              {!!label(cur) && <Txt v="label" raw style={{ textAlign: 'center' }}>{label(cur)}</Txt>}
              <Pic uri={cur.front_img} />
              {!!cur.front && <Txt raw style={{ fontFamily: font.head, fontSize: 26, textAlign: 'center' }}>{cur.front}</Txt>}
              {show && (
                <>
                  <View style={{ height: 1, backgroundColor: t.border }} />
                  <Pic uri={cur.back_img} />
                  {!!cur.back && <Txt raw style={{ fontSize: 20, textAlign: 'center', lineHeight: 28 }}>{cur.back}</Txt>}
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
            {total.current === 0 ? 'Come back when cards are due, or add more.' : tr('{done} reviews · {again} to relearn', { done: stats.current.done, again: stats.current.again })}
          </Txt>
          <Btn label="Back" onPress={() => router.back()} />
        </View>
      )}
    </View>
  );
}

export default withBoundary(Review, 'Review');

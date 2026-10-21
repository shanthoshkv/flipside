import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayDetail } from '../components/DayDetail';
import { withBoundary } from '../components/ErrorBoundary';
import { Txt, tap } from '../components/ui';
import { useData } from '../data';
import { tr } from '../i18n';
import { font, radius, space, useTheme } from '../theme';
import { dayKey, fmtDate, fmtDur } from '../util';

type Hit = { key: string; kind: string; title: string; sub: string; go: () => void };

/** One box over subjects, topics, session notes, flashcards and exams. */
function Search() {
  const t = useTheme(), { top } = useSafeAreaInsets();
  const { tasks, sessions, cards, exams } = useData();
  const [q, setQ] = useState(''), [day, setDay] = useState<string | null>(null);
  const hits = useMemo<Hit[]>(() => {
    const n = q.trim().toLowerCase();
    if (n.length < 2) return [];
    const has = (...xs: (string | null | undefined)[]) => xs.some((x) => x?.toLowerCase().includes(n));
    const name = (id: number) => tasks.find((k) => k.id === id)?.name ?? '';
    return [
      ...tasks.filter((k) => has(k.name)).map((k) => ({ key: `t${k.id}`, kind: k.parent_id ? 'Topic' : 'Subject', title: k.name, sub: k.parent_id ? name(k.parent_id) : '', go: () => router.navigate('/study') })),
      ...exams.filter((e) => has(e.name)).map((e) => ({ key: `e${e.id}`, kind: 'Exam', title: e.name, sub: fmtDate(e.date), go: () => router.navigate('/study') })),
      ...cards.filter((c) => has(c.front, c.back)).slice(0, 50).map((c) => ({ key: `c${c.id}`, kind: 'Card', title: c.front, sub: c.back, go: () => router.push('/cards') })),
      ...sessions.filter((s) => has(s.note) || (has(name(s.task_id)) && s.note)).slice(-100).reverse().map((s) => ({
        key: `s${s.id}`, kind: 'Session', title: s.note, sub: `${fmtDate(dayKey(s.start_ts))} · ${name(s.task_id)} · ${fmtDur((s.end_ts ?? s.start_ts) - s.start_ts)}`, go: () => setDay(dayKey(s.start_ts)),
      })),
    ];
  }, [q, tasks, sessions, cards, exams]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(2), paddingHorizontal: space(4), gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
        <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={{ minHeight: 48, justifyContent: 'center' }}><Txt v="h3" c={t.accentText}>‹ Back</Txt></Pressable>
        <TextInput autoFocus value={q} onChangeText={setQ} placeholder={tr('Search subjects, notes, cards, exams')} placeholderTextColor={t.muted} accessibilityLabel={tr('Search')}
          style={{ flex: 1, minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface, color: t.text, paddingHorizontal: space(3), fontFamily: font.body, fontSize: 15 }} />
      </View>
      <FlatList data={hits} keyExtractor={(h) => h.key} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space(2), paddingBottom: space(8) }}
        ListEmptyComponent={<Txt v="small" style={{ textAlign: 'center', marginTop: space(6) }}>{q.trim().length < 2 ? 'Type at least 2 letters.' : 'No matches.'}</Txt>}
        renderItem={({ item: h }) => (
          <Pressable onPress={() => { tap(); h.go(); }} style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: space(3), gap: 2 }}>
            <Txt v="label">{h.kind}</Txt>
            <Txt v="h3" raw numberOfLines={2}>{h.title}</Txt>
            {!!h.sub && <Txt v="small" raw numberOfLines={1}>{h.sub}</Txt>}
          </Pressable>
        )} />
      <DayDetail day={day} sessions={sessions} tasks={tasks} onClose={() => setDay(null)} />
    </View>
  );
}

export default withBoundary(Search, 'Search');

import { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { rateSession } from '../db';
import { useData } from '../data';
import { useFlip } from '../engine/flip';
import { tr } from '../i18n';
import { fmtDur } from '../util';
import { font, radius, space, useTheme } from '../theme';
import { Btn, Txt, tap } from './ui';

const FACES = ['Rough', 'Meh', 'Okay', 'Good', 'Deep'];

/** Shown after a session ends: one-tap focus quality + optional note. */
export function Reflect() {
  const t = useTheme();
  const id = useFlip((s) => s.reflectId), idle = useFlip((s) => s.status === 'IDLE');
  const run = useFlip((s) => s.lastRun);
  const [q, setQ] = useState<number | null>(null), [note, setNote] = useState('');
  const goal = useFlip((s) => s.goal), [hit, setHit] = useState<boolean | null>(null);
  const breakMin = run ? Math.max(5, Math.min(25, Math.round(run.ms / 60000 / 5))) : 0;
  const close = async (save: boolean) => {
    const text = [goal && hit != null ? `${hit ? '✓' : '✗'} ${goal}` : '', note.trim()].filter(Boolean).join(' · ');
    if (save && id != null && (q != null || text)) { await rateSession(id, q, text); await useData.getState().reload(); }
    useFlip.setState({ reflectId: null, goal: hit === false ? goal : '' }); setQ(null); setNote(''); setHit(null);
  };
  return (
    <Modal transparent animationType="fade" visible={id != null && idle} onRequestClose={() => close(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }}>
        <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(5), gap: space(4) }}>
          <Txt v="h2">How was that focus?</Txt>
          {run && <Txt v="small" raw>{`${tr('You focused for {t}.', { t: fmtDur(run.ms) })}${run.mode === 'flowtime' ? ` ${tr('Suggested break: {n} min.', { n: breakMin })}` : ''}`}</Txt>}
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            {FACES.map((f, i) => {
              const on = q === i + 1;
              return (
                <Pressable key={f} accessibilityLabel={`Focus ${f}`} onPress={() => { tap(); setQ(i + 1); }}
                  style={{ flex: 1, minHeight: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: on ? t.accentA : t.surface2 }}>
                  <Txt v="h2" c={on ? '#1A1206' : t.text}>{i + 1}</Txt>
                  <Txt v="small" c={on ? '#1A1206' : t.muted} style={{ fontSize: 10 }}>{f}</Txt>
                </Pressable>
              );
            })}
          </View>
          {!!goal && (
            <View style={{ gap: space(2) }}>
              <Txt v="small" raw>{tr('Goal: {g}', { g: goal })}</Txt>
              <View style={{ flexDirection: 'row', gap: space(2) }}>
                {([true, false] as const).map((v) => (
                  <Btn key={String(v)} kind={hit === v ? 'primary' : 'ghost'} label={v ? 'Done' : 'Not yet'} onPress={() => setHit(v)} style={{ flex: 1 }} />
                ))}
              </View>
            </View>
          )}
          <TextInput value={note} onChangeText={setNote} placeholder={tr('What did you cover? (optional)')} placeholderTextColor={t.muted} multiline
            style={{ minHeight: 64, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, padding: space(3), fontFamily: font.body, fontSize: 15, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', gap: space(2) }}>
            <Btn kind="ghost" label="Skip" onPress={() => close(false)} style={{ flex: 1 }} />
            <Btn label="Save" onPress={() => close(true)} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

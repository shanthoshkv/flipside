import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { addCards, updateCard, type Card } from '../db';
import { useData } from '../data';
import { clozeCards } from '../engine/srs';
import { tr } from '../i18n';
import { font, radius, space, useTheme } from '../theme';
import { TaskPicker } from './TaskPicker';
import { Btn, Txt, tap } from './ui';

/** Copy a picked image into app storage so it survives the gallery changing. */
async function keepImage(uri: string, side: string) {
  const dir = new Directory(Paths.document, 'cards');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${Date.now()}-${side}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}
export const dropImage = (uri: string | null) => { if (uri) try { new File(uri).delete(); } catch { /* already gone */ } };

/** Add or edit a card: basic, reverse (extra swapped card), cloze ({{c1::answer}}), optional images. */
export function CardEditor({ tasks, edit, sel, setSel, onDone }: {
  tasks: ReturnType<typeof useData.getState>['tasks']; edit: Card | null; sel: number; setSel: (n: number) => void; onDone: () => void;
}) {
  const t = useTheme();
  const reload = useData((s) => s.reload);
  const [front, setFront] = useState(''), [back, setBack] = useState('');
  const [fi, setFi] = useState<string | null>(null), [bi, setBi] = useState<string | null>(null);
  const [rev, setRev] = useState(false);
  useEffect(() => { setFront(edit?.front ?? ''); setBack(edit?.back ?? ''); setFi(edit?.front_img ?? null); setBi(edit?.back_img ?? null); setRev(false); }, [edit?.id]);

  const cloze = !edit && /\{\{.+?\}\}/.test(front);
  const ok = cloze || ((front.trim() || fi) && (back.trim() || bi));
  const input = { minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, paddingHorizontal: space(4), paddingVertical: space(3), fontFamily: font.body, fontSize: 15 };

  const pick = async (side: 'front' | 'back') => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled) return;
    try { const u = await keepImage(r.assets[0].uri, side); if (side === 'front') { dropImage(fi); setFi(u); } else { dropImage(bi); setBi(u); } }
    catch (e) { Alert.alert(tr('Could not add image'), String(e)); }
  };

  const save = async () => {
    if (!ok) return;
    if (edit) await updateCard(edit.id, sel, front.trim(), back.trim(), fi, bi);
    else if (cloze) await addCards(clozeCards(front.trim(), back.trim()).map((c) => ({ task_id: sel, ...c })));
    else {
      const rows = [{ task_id: sel, front: front.trim(), back: back.trim(), front_img: fi, back_img: bi }];
      if (rev) rows.push({ task_id: sel, front: back.trim(), back: front.trim(), front_img: bi, back_img: fi });
      await addCards(rows);
    }
    setFront(''); setBack(''); setFi(null); setBi(null); setRev(false);
    await reload(); onDone();
  };

  const Img = ({ uri, side, set }: { uri: string | null; side: 'front' | 'back'; set: (u: string | null) => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
      {uri && <Image source={{ uri }} style={{ width: 56, height: 56, borderRadius: radius.sm }} contentFit="cover" accessibilityLabel={`${side} image`} />}
      <Btn kind="ghost" label={uri ? (side === 'front' ? 'Replace front image' : 'Replace back image') : side === 'front' ? '+ front image' : '+ back image'} onPress={() => pick(side)} style={{ flex: 1 }} />
      {uri && <Btn kind="ghost" label="Remove" onPress={() => { dropImage(uri); set(null); }} />}
    </View>
  );

  return (
    <View style={{ gap: space(3) }}>
      <TaskPicker tasks={tasks} selected={sel} onSelect={setSel} />
      <View style={{ paddingHorizontal: space(4), gap: space(2) }}>
        <TextInput value={front} onChangeText={setFront} placeholder={tr('Front, or cloze text like: The {{c1::heart}} pumps {{c2::blood}}')} placeholderTextColor={t.muted} multiline style={input} accessibilityLabel="Front" />
        {!cloze && <Img uri={fi} side="front" set={setFi} />}
        <TextInput value={back} onChangeText={setBack} placeholder={tr(cloze ? 'Extra info shown on the answer (optional)' : 'Back (answer)')} placeholderTextColor={t.muted} multiline style={input} accessibilityLabel="Back" />
        {!cloze && <Img uri={bi} side="back" set={setBi} />}
        {cloze && <Txt v="small">{tr('Cloze detected: one card is made per blank ({n}).', { n: clozeCards(front).length })}</Txt>}
        {!edit && !cloze && (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rev }} onPress={() => { tap(); setRev(!rev); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: rev ? t.success : t.dotOff, backgroundColor: rev ? t.success : 'transparent' }} />
            <Txt>Also add the reverse card (back → front)</Txt>
          </Pressable>
        )}
        <Btn label={edit ? 'Save changes' : 'Add card'} disabled={!ok} onPress={save} />
        {edit && <Btn kind="ghost" label="Cancel edit" onPress={onDone} />}
      </View>
    </View>
  );
}

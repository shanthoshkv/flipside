import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import type { Task } from '../db';
import { categoryColors, font, radius, space, useTheme } from '../theme';
import { Btn, Txt, tap } from './ui';

export function TaskChips({ tasks, selected, onSelect, onAdd, disabled, allowNone }: {
  tasks: Task[]; selected: number | null; onSelect: (id: number) => void;
  onAdd: (name: string, category: string, color: string) => void; disabled?: boolean; allowNone?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const list = allowNone ? [{ id: 0, name: 'No task', category: '', color: t.muted, created_at: 0, archived: 0 }, ...tasks] : tasks;
  const [name, setName] = useState(''), [cat, setCat] = useState(''), [color, setColor] = useState(categoryColors[0]);
  const save = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), cat.trim(), color);
    setName(''); setCat(''); setOpen(false);
  };
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2), paddingHorizontal: space(4) }}>
        {list.map((k) => {
          const on = k.id === selected;
          return (
            <Animated.View key={k.id} layout={LinearTransition.springify()}>
              <Pressable disabled={disabled} accessibilityLabel={`Task ${k.name}`} onPress={() => { tap(); onSelect(k.id); }}
                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space(4), borderRadius: radius.pill,
                  backgroundColor: on ? k.color : t.surface, borderWidth: 1, borderColor: on ? k.color : t.border, opacity: disabled && !on ? 0.4 : 1 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? '#1A1206' : k.color }} />
                <Txt v="h3" c={on ? '#1A1206' : t.text}>{k.name}</Txt>
              </Pressable>
            </Animated.View>
          );
        })}
        <Pressable disabled={disabled} accessibilityLabel="Add task" onPress={() => { tap(); setOpen(true); }}
          style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface2 }}>
          <Txt v="h2">+</Txt>
        </Pressable>
      </ScrollView>
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space(5) }} onPress={() => setOpen(false)}>
          <Pressable style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space(5), gap: space(3) }}>
            <Txt v="h2">New task</Txt>
            {[['Name', name, setName], ['Category (optional)', cat, setCat]].map(([ph, val, fn]: any) => (
              <TextInput key={ph} value={val} onChangeText={fn} placeholder={ph} placeholderTextColor={t.muted}
                style={{ minHeight: 48, borderRadius: radius.sm, backgroundColor: t.surface2, color: t.text, paddingHorizontal: space(4), fontFamily: font.body, fontSize: 15 }} />
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>
              {categoryColors.map((c) => (
                <Pressable key={c} accessibilityLabel={`Colour ${c}`} onPress={() => { tap(); setColor(c); }}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: 3, borderColor: c === color ? t.text : 'transparent' }} />
              ))}
            </View>
            <Btn label="Add task" onPress={save} disabled={!name.trim()} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Modal, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addTask } from '../db';
import { useData } from '../data';
import { useSettings } from '../store';
import { categoryColors, font, radius, space, useTheme } from '../theme';
import { Stepper } from './controls';
import { FlipIllustration } from './FlipIllustration';
import { Btn, Txt } from './ui';

/** Three screens, shown once: how flipping works, first subject + goal, notification permission in context. */
export function Onboarding() {
  const t = useTheme(), { top, bottom } = useSafeAreaInsets();
  const cfg = useSettings();
  const [page, setPage] = useState(0), [name, setName] = useState('');

  const finish = async () => {
    if (name.trim()) { const id = await addTask(name.trim(), '', categoryColors[0]); cfg.set('lastTaskId', id); await useData.getState().reload(); }
    cfg.set('onboarded', true);
  };
  const next = () => (page < 2 ? setPage(page + 1) : finish());

  return (
    <Modal animationType="fade" statusBarTranslucent visible onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: top + space(6), paddingBottom: bottom + space(4), paddingHorizontal: space(5), gap: space(5) }}>
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => <View key={i} style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? t.accentA : t.dotOff }} />)}
        </View>

        {page === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(4) }}>
            <FlipIllustration armed />
            <Txt v="h1" style={{ textAlign: 'center' }}>Flip to focus</Txt>
            <Txt style={{ textAlign: 'center' }}>Tap Ready, then lay your phone screen-down. The timer starts after a second. Lift it to stop, or turn on Pause in Settings to resume by flipping back.</Txt>
            <Txt v="small" style={{ textAlign: 'center' }}>Everything stays on this phone. No account, no internet.</Txt>
          </View>
        )}

        {page === 1 && (
          <View style={{ flex: 1, justifyContent: 'center', gap: space(4) }}>
            <Txt v="h1">What are you studying?</Txt>
            <Txt>Add your first subject. You can add topics, exams and more later in the Study tab.</Txt>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Physics" placeholderTextColor={t.muted} accessibilityLabel="First subject name"
              style={{ minHeight: 52, borderRadius: radius.md, backgroundColor: t.surface, color: t.text, paddingHorizontal: space(4), fontFamily: font.body, fontSize: 16 }} />
            <Stepper label="Daily goal" value={cfg.goalMin / 60} unit="h" min={0.5} max={16} step={0.5} onChange={(h) => cfg.set('goalMin', Math.round(h * 60))} />
          </View>
        )}

        {page === 2 && (
          <View style={{ flex: 1, justifyContent: 'center', gap: space(4) }}>
            <Txt v="h1">Stay on track</Txt>
            <Txt>Flipside can notify you when a Pomodoro ends and keep detecting your flip while you switch apps. Android needs your permission to show these.</Txt>
            <Btn kind="ghost" label="Allow notifications" onPress={() => Notifications.requestPermissionsAsync().catch(() => {})} />
            <Txt v="small">Reminders for planned study blocks are optional and off by default. You can change this any time in Settings.</Txt>
          </View>
        )}

        <View style={{ gap: space(2) }}>
          <Btn label={page < 2 ? 'Next' : 'Start studying'} onPress={next} />
          {page > 0 && <Btn kind="ghost" label="Back" onPress={() => setPage(page - 1)} />}
        </View>
      </View>
    </Modal>
  );
}

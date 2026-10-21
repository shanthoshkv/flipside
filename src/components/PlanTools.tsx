import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Alert } from 'react-native';
import { repeatPlan, replaceBusy } from '../db';
import { parseIcs } from '../ics';
import { tr } from '../i18n';
import { scheduleSync } from '../reminders';
import { addDays, dayKey, keyToTs } from '../util';
import { Btn, Txt } from './ui';

/** Calendar import (busy blocks) and weekly repeat of a day's plan. */
export function PlanTools({ date, onChange }: { date: string; onChange: () => void }) {
  const importIcs = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/calendar', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (r.canceled) return;
      const now = Date.now(), rows = parseIcs(await new File(r.assets[0].uri).text(), now - 86400000, now + 180 * 86400000);
      await replaceBusy(rows); onChange();
      Alert.alert(tr('Calendar imported'), tr('{n} busy blocks in the next 6 months. Auto-plan skips them.', { n: rows.length }));
    } catch (e) { Alert.alert(tr('Import failed'), String(e)); }
  };
  const repeat = async () => {
    const dates = [1, 2, 3, 4].map((w) => dayKey(addDays(keyToTs(date), 7 * w)));
    const n = await repeatPlan(date, dates); scheduleSync(); onChange();
    Alert.alert(n ? tr('Repeated') : tr('Nothing to add'), n ? tr('Copied to the same weekday for the next 4 weeks.') : tr('Plan something on this day first.'));
  };
  return (
    <>
      <Btn kind="ghost" label="Repeat this day weekly (4 weeks)" onPress={repeat} />
      <Btn kind="ghost" label="Import busy times (.ics)" onPress={importIcs} />
      <Btn kind="ghost" label="Clear imported calendar" onPress={async () => { await replaceBusy([]); onChange(); }} />
      <Txt v="small">Export your timetable or calendar as an .ics file. It is read on the phone only; grey slots are busy.</Txt>
    </>
  );
}

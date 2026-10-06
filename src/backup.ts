import { Directory, File } from 'expo-file-system';
import { useData } from './data';
import { exportAll, importAll } from './db';
import { useSettings } from './store';
import { dayKey } from './util';

const PREFIX = 'flipside-backup-', KEEP = 7, EVERY_MS = 20 * 3600000;

const backups = (dir: Directory) =>
  dir.list().filter((f): f is File => f instanceof File && f.name.startsWith(PREFIX) && f.name.endsWith('.json')).sort((a, b) => (a.name < b.name ? 1 : -1));

/** Let the user choose a folder (Android document picker), then write the first backup straight away. */
export async function chooseBackupFolder() {
  const dir = await Directory.pickDirectoryAsync();
  useSettings.getState().set('backupDir', dir.uri);
  return runBackup(true);
}

/** Writes one JSON per day, keeps the newest 7. Returns an error message, or null on success/skip. */
export async function runBackup(force = false): Promise<string | null> {
  const { backupDir, lastBackup } = useSettings.getState();
  if (!backupDir || (!force && Date.now() - lastBackup < EVERY_MS)) return null;
  try {
    const dir = new Directory(backupDir), name = `${PREFIX}${dayKey(Date.now())}.json`;
    for (const f of backups(dir)) if (f.name === name) f.delete();
    dir.createFile(name, 'application/json').write(await exportAll());
    backups(dir).slice(KEEP).forEach((f) => f.delete());
    useSettings.getState().set('lastBackup', Date.now());
    return null;
  } catch (e) {
    return String(e);
  }
}

/** Replaces all data with the newest backup in the chosen folder. */
export async function restoreLatest() {
  const { backupDir } = useSettings.getState();
  if (!backupDir) throw new Error('No backup folder chosen.');
  const latest = backups(new Directory(backupDir))[0];
  if (!latest) throw new Error('No backups found in that folder.');
  await importAll(await latest.text());
  await useSettings.getState().load();
  await useData.getState().reload();
  return latest.name;
}

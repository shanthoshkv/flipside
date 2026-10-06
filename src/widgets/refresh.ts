import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { renderWidget } from './render';

export const WIDGETS = ['Today', 'QuickStart', 'Week', 'Exam', 'Cards', 'Subjects'] as const;

let pending: ReturnType<typeof setTimeout> | null = null;
/** Debounced: many writes in a row cause one redraw. */
export function refreshWidgets() {
  if (pending) clearTimeout(pending);
  pending = setTimeout(draw, 800);
}

async function draw() {
  if (Platform.OS !== 'android') return;
  await Promise.all(WIDGETS.map((widgetName) =>
    requestWidgetUpdate({ widgetName, renderWidget: (info) => renderWidget(widgetName, info.width) }).catch(() => {})));
}

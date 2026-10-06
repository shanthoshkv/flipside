import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { renderWidget } from './render';

export const WIDGETS = ['Today', 'QuickStart', 'Week'] as const;

export async function refreshWidgets() {
  if (Platform.OS !== 'android') return;
  await Promise.all(WIDGETS.map((widgetName) =>
    requestWidgetUpdate({ widgetName, renderWidget: (info) => renderWidget(widgetName, info.width) }).catch(() => {})));
}

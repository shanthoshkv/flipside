import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { renderWidget } from './render';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget: draw } = props;
  if (widgetAction === 'WIDGET_DELETED') return;
  draw(await renderWidget(widgetInfo.widgetName, widgetInfo.width));
}

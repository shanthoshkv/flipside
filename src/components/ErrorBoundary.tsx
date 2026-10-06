import { Component, type ComponentType, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSettings } from '../store';
import { Btn, Txt } from './ui';

interface P { name: string; children: ReactNode }
interface S { err: Error | null }

/** A render error on one screen shows its message and a retry button instead of closing the whole app. */
export class ErrorBoundary extends Component<P, S> {
  state: S = { err: null };
  static getDerivedStateFromError(err: Error): S { return { err }; }
  componentDidCatch(err: Error) {
    try { useSettings.getState().set('lastError', `${this.props.name}: ${err.message}\n${(err.stack ?? '').split('\n').slice(0, 6).join('\n')}`); } catch { /* storage unavailable */ }
  }
  render() {
    const { err } = this.state;
    if (!err) return this.props.children;
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: '#0B0B10' }}>
        <Txt v="h2" c="#F4F4F8" raw>{`${this.props.name} hit a problem`}</Txt>
        <ScrollView style={{ maxHeight: 220 }}><Text selectable style={{ color: '#FF9B9B', fontSize: 12 }}>{`${err.message}\n\n${(err.stack ?? '').split('\n').slice(0, 6).join('\n')}`}</Text></ScrollView>
        <Btn label="Try again" onPress={() => this.setState({ err: null })} />
      </View>
    );
  }
}

export const withBoundary = <T extends object>(C: ComponentType<T>, name: string) =>
  function Guarded(props: T) { return <ErrorBoundary name={name}><C {...props} /></ErrorBoundary>; };

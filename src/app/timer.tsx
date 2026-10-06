import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useFlip } from '../engine/flip';

// flipside://timer?task=<id> → open straight into ARMED
export default function TimerLink() {
  const { task } = useLocalSearchParams<{ task?: string }>();
  useEffect(() => {
    if (task !== undefined) useFlip.getState().arm(Number(task) || 0);
    router.replace('/');
  }, [task]);
  return null;
}

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useFlip } from '../engine/flip';

// flipside://timer?task=<id> → open straight into ARMED
export default function TimerLink() {
  const { task } = useLocalSearchParams<{ task?: string }>();
  useEffect(() => {
    const id = Number(task);
    if (id) useFlip.getState().arm(id);
    router.replace('/');
  }, [task]);
  return null;
}

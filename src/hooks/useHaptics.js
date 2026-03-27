import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '@/lib/capacitor';

export function useHaptics() {
  const tapLight = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  }, []);

  const tapMedium = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  }, []);

  const tapHeavy = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }, []);

  const success = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Success });
  }, []);

  const warning = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Warning });
  }, []);

  const error = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Error });
  }, []);

  return { tapLight, tapMedium, tapHeavy, success, warning, error };
}

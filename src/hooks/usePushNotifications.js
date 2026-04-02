import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from '@/lib/capacitor';
import { api } from '@/api/apiClient';

export function usePushNotifications({ userEmail, onNotificationReceived, onNotificationTapped } = {}) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isNative() || !userEmail || registeredRef.current) return;

    let registrationListener;
    let errorListener;
    let receivedListener;
    let actionListener;

    async function setup() {
      errorListener = await PushNotifications.addListener('registrationError', () => {
        // Silent — push not available on this device
      });

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return;

      await PushNotifications.register();

      registrationListener = await PushNotifications.addListener('registration', async (token) => {
        registeredRef.current = true;
        try {
          await api.integrations.Core.RegisterDeviceToken({
            token: token.value,
            platform: 'ios',
          });
        } catch (_) {
          // Non-critical — app works without push
        }
      });

      receivedListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        if (onNotificationTapped) {
          onNotificationTapped(action.notification);
        }
      });
    }

    setup();

    return () => {
      registrationListener?.remove();
      errorListener?.remove();
      receivedListener?.remove();
      actionListener?.remove();
    };
  }, [userEmail, onNotificationReceived, onNotificationTapped]);
}

export async function setBadgeCount(count) {
  if (!isNative()) return;
  await PushNotifications.removeAllDeliveredNotifications();
}

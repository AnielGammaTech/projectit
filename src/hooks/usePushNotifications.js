import { useEffect, useRef } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from '@/lib/capacitor';
import { api } from '@/api/apiClient';

export function usePushNotifications({ userEmail, onNotificationReceived, onNotificationTapped } = {}) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!isNative() || !userEmail || registeredRef.current) return;

    let registrationListener;
    let receivedListener;
    let actionListener;

    async function setup() {
      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', JSON.stringify(error));
      });

      const permResult = await PushNotifications.requestPermissions();
      console.log('Push permission result:', JSON.stringify(permResult));
      if (permResult.receive !== 'granted') return;

      await PushNotifications.register();
      console.log('Push register called');

      registrationListener = await PushNotifications.addListener('registration', async (token) => {
        console.log('Got device token:', token.value?.substring(0, 20) + '...');
        registeredRef.current = true;
        try {
          const result = await api.integrations.Core.RegisterDeviceToken({
            token: token.value,
            platform: 'ios',
          });
          console.log('Device token registered:', JSON.stringify(result));
        } catch (err) {
          console.error('Failed to register device token:', err);
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
      receivedListener?.remove();
      actionListener?.remove();
    };
  }, [userEmail, onNotificationReceived, onNotificationTapped]);
}

export async function setBadgeCount(count) {
  if (!isNative()) return;
  await PushNotifications.removeAllDeliveredNotifications();
}

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Subscribes to Supabase realtime for new notifications.
 * When a new notification arrives for the current user,
 * it invalidates the notification queries so they refetch instantly.
 *
 * @param {string} userEmail - Current user's email to filter notifications
 */
export function useRealtimeNotifications(userEmail) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !userEmail) return;

    // Subscribe to INSERT events on the user_notifications table for this user
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_email=eq.${userEmail}`,
        },
        () => {
          // Invalidate all notification queries so they refetch
          queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['panelNotifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_email=eq.${userEmail}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['panelNotifications'] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userEmail, queryClient]);
}

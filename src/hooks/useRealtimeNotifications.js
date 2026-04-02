import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useRealtimeNotifications(userEmail) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!supabase || !userEmail) return;

    // Subscribe to all changes on UserNotification table
    // No column filter since user_email is inside JSONB data column
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'UserNotification',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['layoutNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['panelNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['myNotifications'] });
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

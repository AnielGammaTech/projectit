import { useState, useEffect, useRef } from 'react';

const DISMISS_DELAY_MS = 2000;

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setShowReconnected(true);
        timerRef.current = setTimeout(() => {
          setShowReconnected(false);
        }, DISMISS_DELAY_MS);
      }
      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setShowReconnected(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 dark:bg-emerald-700 text-white text-center text-sm font-medium py-2 px-4 shadow-md transition-all duration-300">
        Back online
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 dark:bg-amber-600 text-white text-center text-sm font-medium py-2 px-4 shadow-md">
      You're offline. Changes will sync when reconnected.
    </div>
  );
}

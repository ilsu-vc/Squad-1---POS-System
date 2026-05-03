'use client';

/**
 * useNetworkStatus.ts
 * POS-S6-008-T1: Browser-native network status monitor.
 *
 * Equivalent to @react-native-community/netinfo for a Next.js/browser context.
 * Uses the Web API: navigator.onLine + window 'online'/'offline' events.
 *
 * Returns:
 *   isOnline  — true when the browser reports network connectivity
 *   isOffline — inverse of isOnline (convenience alias)
 */

import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  // SSR-safe initialisation — default to online if window is unavailable
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.info('[NetInfo] Connection restored — isOnline = true');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.warn('[NetInfo] Connection lost — isOnline = false');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync with the current state in case events fired before mount
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

import { useEffect, useRef, useCallback } from 'react';

interface UseInactivityLogoutOptions {
  timeout?: number; // in milliseconds
  onLogout: () => void;
  enabled?: boolean;
}

/**
 * Hook to automatically logout user after a period of inactivity
 * Default timeout is 15 minutes (900000ms)
 */
export const useInactivityLogout = ({
  timeout = 15 * 60 * 1000, // 15 minutes default
  onLogout,
  enabled = true,
}: UseInactivityLogoutOptions) => {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set new timeout
    timeoutIdRef.current = setTimeout(() => {
      console.log('[Inactivity Logout] User inactive for', timeout / 1000, 'seconds. Logging out...');
      onLogout();
    }, timeout);
  }, [timeout, onLogout, enabled]);

  useEffect(() => {
    if (!enabled) {
      // Clear timeout if disabled
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      return;
    }

    // Events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle the reset to avoid excessive timer resets
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledReset = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          resetTimer();
          throttleTimeout = null;
        }, 1000); // Throttle to once per second
      }
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, throttledReset);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [resetTimer, enabled]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
};

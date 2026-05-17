import { renderHook, act } from '@testing-library/react';
import { useInactivityLogout } from '../src/hooks/useInactivityLogout';

describe('useInactivityLogout Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('SCRUM-388: Inactivity Auto-Logout', () => {
    it('should call onLogout after timeout period', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      // Fast-forward time by 15 minutes
      act(() => {
        jest.advanceTimersByTime(timeout);
      });

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should not call onLogout before timeout period', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      // Fast-forward time by 14 minutes (less than timeout)
      act(() => {
        jest.advanceTimersByTime(14 * 60 * 1000);
      });

      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should reset timer on user activity', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      // Fast-forward time by 10 minutes
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Simulate user activity (mouse move)
      act(() => {
        window.dispatchEvent(new MouseEvent('mousemove'));
      });

      // Wait for throttle timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Fast-forward another 10 minutes (total 20 minutes from start, but only 10 from last activity)
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Should not have logged out yet because timer was reset
      expect(onLogout).not.toHaveBeenCalled();

      // Fast-forward another 5 minutes (now 15 minutes from last activity)
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      // Now should have logged out
      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should not call onLogout when disabled', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: false,
        })
      );

      // Fast-forward time by 15 minutes
      act(() => {
        jest.advanceTimersByTime(timeout);
      });

      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should handle multiple activity events', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

      // Simulate multiple activity events over time
      for (let i = 0; i < 5; i++) {
        act(() => {
          jest.advanceTimersByTime(3 * 60 * 1000); // 3 minutes
        });

        act(() => {
          const event = activityEvents[i % activityEvents.length];
          window.dispatchEvent(new Event(event));
        });

        act(() => {
          jest.advanceTimersByTime(1000); // Wait for throttle
        });
      }

      // Total time passed: 5 * 3 minutes = 15 minutes, but timer kept resetting
      expect(onLogout).not.toHaveBeenCalled();

      // Now wait 15 minutes without activity
      act(() => {
        jest.advanceTimersByTime(timeout);
      });

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should throttle activity events to once per second', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      const { result } = renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      const resetTimerSpy = jest.spyOn(result.current, 'resetTimer');

      // Simulate rapid mouse movements (100 events in 100ms)
      act(() => {
        for (let i = 0; i < 100; i++) {
          window.dispatchEvent(new MouseEvent('mousemove'));
          jest.advanceTimersByTime(1);
        }
      });

      // Should have throttled to only a few calls
      expect(resetTimerSpy.mock.calls.length).toBeLessThan(10);
    });

    it('should cleanup timers on unmount', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      const { unmount } = renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      // Unmount the hook
      unmount();

      // Fast-forward time by 15 minutes
      act(() => {
        jest.advanceTimersByTime(timeout);
      });

      // Should not have called onLogout because hook was unmounted
      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should use custom timeout value', () => {
      const onLogout = jest.fn();
      const customTimeout = 5 * 60 * 1000; // 5 minutes

      renderHook(() =>
        useInactivityLogout({
          timeout: customTimeout,
          onLogout,
          enabled: true,
        })
      );

      // Fast-forward time by 5 minutes
      act(() => {
        jest.advanceTimersByTime(customTimeout);
      });

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should handle enabled state changes', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000; // 15 minutes

      const { rerender } = renderHook(
        ({ enabled }) =>
          useInactivityLogout({
            timeout,
            onLogout,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      // Fast-forward time by 10 minutes
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Disable the hook
      rerender({ enabled: false });

      // Fast-forward another 10 minutes (total 20 minutes)
      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      // Should not have logged out because hook was disabled
      expect(onLogout).not.toHaveBeenCalled();

      // Re-enable the hook
      rerender({ enabled: true });

      // Fast-forward 15 minutes
      act(() => {
        jest.advanceTimersByTime(timeout);
      });

      // Now should have logged out
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Activity Event Monitoring', () => {
    it('should monitor mousedown events', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      act(() => {
        window.dispatchEvent(new MouseEvent('mousedown'));
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should monitor keypress events', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keypress'));
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should monitor scroll events', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      act(() => {
        window.dispatchEvent(new Event('scroll'));
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should monitor touchstart events', () => {
      const onLogout = jest.fn();
      const timeout = 15 * 60 * 1000;

      renderHook(() =>
        useInactivityLogout({
          timeout,
          onLogout,
          enabled: true,
        })
      );

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      act(() => {
        window.dispatchEvent(new TouchEvent('touchstart'));
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        jest.advanceTimersByTime(10 * 60 * 1000);
      });

      expect(onLogout).not.toHaveBeenCalled();
    });
  });
});

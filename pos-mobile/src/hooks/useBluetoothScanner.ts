/**
 * useBluetoothScanner Hook
 *
 * SCRUM 395: Keyboard event listener for Bluetooth scanner input.
 *
 * Bluetooth barcode scanners behave like keyboards — they rapidly type
 * characters followed by an Enter key. This hook captures that rapid input
 * and fires a callback with the complete barcode string.
 *
 * Detection logic:
 * - Characters arriving within 50ms of each other are treated as scanner input
 * - The "Enter" key (or newline) signals the end of a scan
 * - A minimum length of 3 characters is required to filter out accidental presses
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

interface UseBluetoothScannerOptions {
  /** Called with the full scanned barcode string */
  onScan: (barcode: string) => void;
  /** Whether the listener is active (default: true) */
  enabled?: boolean;
  /** Maximum time (ms) between keystrokes to consider them scanner input */
  maxKeystrokeInterval?: number;
  /** Minimum barcode length to accept */
  minLength?: number;
}

export function useBluetoothScanner({
  onScan,
  enabled = true,
  maxKeystrokeInterval = 50,
  minLength = 3,
}: UseBluetoothScannerOptions) {
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    lastKeystrokeRef.current = 0;
  }, []);

  const processBuffer = useCallback(() => {
    const barcode = bufferRef.current.trim();
    if (barcode.length >= minLength) {
      onScan(barcode);
    }
    resetBuffer();
  }, [onScan, minLength, resetBuffer]);

  useEffect(() => {
    if (!enabled) return;

    // On web, we can listen to DOM keyboard events
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        const now = Date.now();
        const timeSinceLast = now - lastKeystrokeRef.current;

        // If too much time has passed, start fresh
        if (timeSinceLast > maxKeystrokeInterval && bufferRef.current.length > 0) {
          resetBuffer();
        }

        // Enter key = end of scan
        if (e.key === 'Enter') {
          e.preventDefault();
          processBuffer();
          return;
        }

        // Only accept printable single characters (scanner output)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          bufferRef.current += e.key;
          lastKeystrokeRef.current = now;

          // Auto-process after a brief pause (in case Enter isn't sent)
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            if (bufferRef.current.length >= minLength) {
              processBuffer();
            } else {
              resetBuffer();
            }
          }, 200);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    // On native platforms (iOS/Android), Bluetooth scanners send
    // TextInput events. We expose a handler that can be attached
    // to a hidden TextInput. See useBluetoothScannerInput below.
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, maxKeystrokeInterval, minLength, processBuffer, resetBuffer]);

  /**
   * For native platforms: attach this to a hidden TextInput's onChangeText.
   * Bluetooth scanners will type into the focused TextInput and press Enter.
   */
  const handleTextInput = useCallback(
    (text: string) => {
      if (!enabled) return;
      const now = Date.now();

      // If text arrives as a batch (scanner sends it all at once)
      if (text.length >= minLength) {
        // Scanner likely sent the entire barcode at once
        bufferRef.current = text;
        lastKeystrokeRef.current = now;
        processBuffer();
        return;
      }

      // Single character — accumulate
      bufferRef.current += text;
      lastKeystrokeRef.current = now;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (bufferRef.current.length >= minLength) {
          processBuffer();
        } else {
          resetBuffer();
        }
      }, 200);
    },
    [enabled, minLength, processBuffer, resetBuffer]
  );

  /**
   * For native platforms: attach this to a hidden TextInput's onSubmitEditing.
   */
  const handleSubmit = useCallback(() => {
    if (!enabled) return;
    processBuffer();
  }, [enabled, processBuffer]);

  return { handleTextInput, handleSubmit, resetBuffer };
}

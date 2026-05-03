// src/utils/useBarcodeScanner.ts
import { useEffect, useRef } from 'react';

export const useBarcodeScanner = (onScan: (code: string) => void): void => {
    const barcodeBuffer = useRef<string>('');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            // 1. Ignore keystrokes if the user is currently typing in the Search Bar
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }

            // 2. Scanners always send an 'Enter' key at the very end
            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length > 3) {
                    // Valid barcodes are usually > 3 chars
                    onScan(barcodeBuffer.current);
                }
                barcodeBuffer.current = ''; // Reset buffer after scan
                return;
            }

            // 3. Capture the actual characters
            if (e.key.length === 1) {
                barcodeBuffer.current += e.key;

                // 4. The "Scanner vs Human" check
                // If a keystroke takes longer than 50ms, it's a human typing. Clear the buffer.
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => {
                    barcodeBuffer.current = '';
                }, 50);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timer.current) clearTimeout(timer.current);
        };
    }, [onScan]);
};

import { useState, useEffect } from 'react';
import { Product } from '../data/products';

export interface CartItem extends Product {
    quantity: number;
}

export interface HeldTransaction {
    id: string; // Unique ID (e.g., Hold-12345)
    cart: CartItem[];
    createdAt: number; // Timestamp
    totalAmount: number; // Storing total for quick display
    itemCount: number;
}

const HOLD_STORAGE_KEY = 'POS_HELD_TRANSACTIONS';
const MAX_HOLDS = 5;
const EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

export const useTransactionHold = () => {
    const [heldTransactions, setHeldTransactions] = useState<HeldTransaction[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(HOLD_STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse held transactions', e);
                return [];
            }
        }
        return [];
    });

    // Save to localStorage whenever heldTransactions changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(heldTransactions));
        }
    }, [heldTransactions]);

    // Periodically clean up expired holds (e.g., every minute)
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            cleanupExpiredHolds();
        }, 60000);
        
        // Also run once on mount
        cleanupExpiredHolds();

        return () => clearInterval(cleanupInterval);
    }, []);

    const cleanupExpiredHolds = () => {
        const now = Date.now();
        setHeldTransactions(prev => {
            const valid = prev.filter(t => now - t.createdAt < EXPIRATION_TIME_MS);
            if (valid.length !== prev.length) {
                return valid;
            }
            return prev;
        });
    };

    const holdCart = (cart: CartItem[], totalAmount: number): { success: boolean; message?: string } => {
        if (cart.length === 0) {
            return { success: false, message: 'Cart is empty. Nothing to hold.' };
        }

        const now = Date.now();
        const valid = heldTransactions.filter(t => now - t.createdAt < EXPIRATION_TIME_MS);

        if (valid.length >= MAX_HOLDS) {
            return { success: false, message: `Maximum limit of ${MAX_HOLDS} held transactions reached.` };
        }

        const newHold: HeldTransaction = {
            id: `HOLD-${Date.now().toString().slice(-6)}`,
            cart: [...cart],
            createdAt: now,
            totalAmount,
            itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
        };

        setHeldTransactions([...valid, newHold]);
        return { success: true, message: 'Order placed on hold.' };
    };

    const removeHold = (id: string) => {
        setHeldTransactions(prev => prev.filter(t => t.id !== id));
    };

    const resumeHold = (id: string): CartItem[] | null => {
        const transaction = heldTransactions.find(t => t.id === id);
        if (transaction) {
            removeHold(id); // Remove it from hold list
            return transaction.cart;
        }
        return null;
    };

    return {
        heldTransactions,
        holdCart,
        removeHold,
        resumeHold,
        cleanupExpiredHolds
    };
};

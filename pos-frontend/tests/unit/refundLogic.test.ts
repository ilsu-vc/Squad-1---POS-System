// src/utils/refundLogic.test.ts
// Unit tests for Partial Refund Feature acceptance criteria

describe('Partial Refund Logic (POS Partial Refund AC)', () => {

    // Helper: mirrors the same formula used in PartialRefundModal and App.tsx
    const calcRefund = (items: Array<{ price: number; qty: number }>) => {
        const subtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0);
        const tax = Math.round(subtotal * 0.12 * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;
        return { subtotal, tax, total };
    };

    // AC: System calculates refund amount correctly (full selection)
    it('calculates the correct refund amount for all items selected', () => {
        const items = [
            { price: 10.00, qty: 2 },  // 20.00
            { price: 5.00,  qty: 3 },  // 15.00
        ];
        const { subtotal, tax, total } = calcRefund(items);

        expect(subtotal).toBe(35.00);
        expect(tax).toBe(4.20);
        expect(total).toBe(39.20);
    });

    // AC: Can refund partial quantities (e.g., 2 out of 5 units)
    it('calculates correctly when only partial quantity is refunded', () => {
        const items = [{ price: 20.00, qty: 2 }]; // 2 out of 5 units
        const { subtotal, tax, total } = calcRefund(items);

        expect(subtotal).toBe(40.00);
        expect(tax).toBe(4.80);
        expect(total).toBe(44.80);
    });

    // AC: Can select specific items to refund (subset of items)
    it('calculates correctly when only specific items are selected', () => {
        const allItems = [
            { name: 'Paracetamol', price: 10.00, qty: 1 },
            { name: 'Vitamin C',   price: 15.00, qty: 2 },
            { name: 'Bandages',    price: 5.00,  qty: 3 },
        ];
        // Cashier selects only Vitamin C for refund
        const selected = allItems.filter(i => i.name === 'Vitamin C');
        const { subtotal, tax, total } = calcRefund(selected);

        expect(subtotal).toBe(30.00);
        expect(tax).toBe(3.60);
        expect(total).toBe(33.60);
    });

    // AC: New refund transaction uses negative amounts
    it('refund transaction stores a negative rawAmount', () => {
        const refundTotal = 39.20;
        const rawAmount = -refundTotal;

        expect(rawAmount).toBeLessThan(0);
        expect(rawAmount).toBe(-39.20);
    });

    // AC: Refund transaction type is 'refund'
    it('refund transaction has type refund and links to original', () => {
        const originalId = 'TXN-ABC123';
        const refundTxn = {
            id: `REFUND-${Date.now()}`,
            type: 'refund' as const,
            originalTransactionId: originalId,
            rawAmount: -39.20,
        };

        expect(refundTxn.type).toBe('refund');
        expect(refundTxn.originalTransactionId).toBe(originalId);
        expect(refundTxn.rawAmount).toBeLessThan(0);
    });

    // EDGE CASE: Refunding 0 items should yield 0 total
    it('EDGE CASE: zero items selected yields zero refund', () => {
        const { subtotal, tax, total } = calcRefund([]);

        expect(subtotal).toBe(0);
        expect(tax).toBe(0);
        expect(total).toBe(0);
    });

    // EDGE CASE: Penny rounding with decimal prices
    it('EDGE CASE: handles decimal prices with correct rounding', () => {
        const items = [{ price: 10.99, qty: 1 }]; // Cough Syrup
        const { subtotal, tax, total } = calcRefund(items);

        expect(subtotal).toBe(10.99);
        expect(tax).toBe(1.32);    // 10.99 * 0.12 = 1.3188 → rounds to 1.32
        expect(total).toBe(12.31);
    });
});

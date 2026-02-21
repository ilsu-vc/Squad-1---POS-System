import { calculateCartTotals, formatCurrencyPHP } from './TransactionService.js';

describe('POS-003: Transaction Total Calculation', () => {
    
    const mockCart = [
        { name: 'Coffee', price: 112.00, quantity: 1 } // Picked 112 because 112 / 1.12 = 100
    ];

    test('calculates correct inclusive VAT and Subtotal', () => {
        const totals = calculateCartTotals(mockCart);
        
        // Grand total should be exactly 112
        expect(totals.grandTotal).toBeCloseTo(112.00);
        
        // Subtotal (Vatable Sales) should be 100
        expect(totals.subtotal).toBeCloseTo(100.00);
        
        // VAT should be 12
        expect(totals.vatAmount).toBeCloseTo(12.00);
    });

    test('formats currency correctly to PHP with 2 decimal places', () => {
        const formatted = formatCurrencyPHP(112);
        // Note: The exact string might vary slightly by Node/browser version, 
        // but it will look like "₱112.00" or "PHP 112.00"
        expect(formatted).toMatch(/112\.00/);
    });
});
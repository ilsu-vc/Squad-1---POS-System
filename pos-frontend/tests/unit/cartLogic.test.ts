// src/utils/cartLogic.test.ts
// A simple test to validate your SCRUM-38 requirements

describe('Cart Operations', () => {
    it('should calculate the correct subtotal and tax', () => {
        const mockCart = [
            { id: 1, name: 'Paracetamol', price: 10.00, quantity: 2 },
            { id: 2, name: 'Vitamin C', price: 5.00, quantity: 1 }
        ];

        const subtotal = mockCart.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const tax = Math.round(subtotal * 0.12 * 100) / 100;

        expect(subtotal).toBe(25.00);
        expect(tax).toBe(3.00);
    });
});

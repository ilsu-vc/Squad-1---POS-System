const VAT_RATE = 0.12;

export function calculateCartTotals(cartItems) {
    const grandTotal = cartItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);

    const vatableSales = grandTotal / (1 + VAT_RATE);

    const vatAmount = grandTotal - vatableSales;

    return {
        subtotal: vatableSales,
        vatAmount: vatAmount,
        grandTotal: grandTotal
    };
}

export function formatCurrencyPHP(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
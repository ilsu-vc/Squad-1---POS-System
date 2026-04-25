/**
 * Returns the CSS class name for the payment method pill/badge.
 */
export const getMethodPillClass = (method: string): string => {
    if (method === 'Credit/Debit Card') return 'card';
    if (method === 'Cash Payment') return 'cash';
    if (method === 'Mobile Payment') return 'mobile';
    return '';
};

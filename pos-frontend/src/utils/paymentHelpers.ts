/**
 * Returns the CSS class name for the payment method pill/badge.
 */
export const getMethodPillClass = (method: string): string => {
    const normalized = (method || '').trim().toLowerCase();
    if (normalized === 'credit/debit card' || normalized === 'credit card' || normalized === 'card' || normalized === 'card payment') return 'card';
    if (normalized === 'cash payment' || normalized === 'cash') return 'cash';
    if (normalized === 'mobile payment' || normalized === 'mobile' || normalized === 'gcash' || normalized === 'gcash / mobile') return 'mobile';
    if (normalized === 'split' || normalized === 'split payment') return 'split';
    return '';
};

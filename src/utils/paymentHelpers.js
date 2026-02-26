/**
 * Returns the CSS class name for the payment method pill/badge.
 * @param {string} method - e.g. "Cash Payment", "Credit/Debit Card", "Mobile Payment"
 * @returns {string} CSS class suffix
 */
export const getMethodPillClass = (method) => {
  if (method === 'Credit/Debit Card') return 'card';
  if (method === 'Cash Payment')      return 'cash';
  if (method === 'Mobile Payment')    return 'mobile';
  return '';
};

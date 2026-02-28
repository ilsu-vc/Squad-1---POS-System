/**
 * Calculates VAT details based on an inclusive total.
 * Formula from POS-008: VAT = Total / 1.12 * 0.12
 */
export const calculateReceiptVAT = (totalInclusive) => {
  if (!totalInclusive || totalInclusive <= 0) {
    return {
      vatExclusive: 0,
      vatAmount: 0,
      totalInclusive: 0
    };
  }

  // Calculate VAT and immediately round it to 2 decimal places
  const rawVatAmount = (totalInclusive / 1.12) * 0.12;
  const vatAmount = Number(rawVatAmount.toFixed(2));

  // Subtract the ROUNDED VAT from the total to prevent 1-cent discrepancies
  const vatExclusive = Number((totalInclusive - vatAmount).toFixed(2));

  return {
    vatExclusive: vatExclusive,
    vatAmount: vatAmount,
    totalInclusive: Number(totalInclusive.toFixed(2))
  };
};
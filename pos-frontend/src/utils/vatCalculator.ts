/**
 * Calculates VAT details based on an inclusive total.
 * Formula from POS-008: VAT = Total / 1.12 * 0.12
 */

export interface VATResult {
    vatExclusive: number;
    vatAmount: number;
    totalInclusive: number;
}

export interface TaxDiscountBreakdown {
    grossVatableSales: number;
    vatExemptSales: number;
    vatableSales: number;
    vatAmount: number;
    vatDeduction: number;
    discountAmount: number;
    totalDiscountAndDeduction: number;
    totalDue: number;
    isVatExempt: boolean;
}

const roundCurrency = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100;

export const isVatExemptDiscountType = (discountType?: string | null): boolean => {
    const normalized = String(discountType || '').trim().toLowerCase();
    return normalized === 'senior' || normalized === 'senior citizen' || normalized === 'pwd';
};

export const calculateTaxDiscountBreakdown = ({
    subtotal,
    vat,
    discountType = 'none',
    discountPercent = 0,
    discountAmount,
}: {
    subtotal: number;
    vat: number;
    discountType?: string | null;
    discountPercent?: number;
    discountAmount?: number;
}): TaxDiscountBreakdown => {
    const grossVatableSales = roundCurrency(Math.max(0, subtotal || 0));
    const originalVat = roundCurrency(Math.max(0, vat || 0));
    const isVatExempt = isVatExemptDiscountType(discountType);
    const percentDiscount = Math.max(0, discountPercent || 0);
    const computedDiscount = discountAmount !== undefined
        ? roundCurrency(Math.max(0, discountAmount || 0))
        : roundCurrency(grossVatableSales * (percentDiscount / 100));
    const vatDeduction = isVatExempt ? originalVat : 0;
    const vatAmount = isVatExempt ? 0 : originalVat;
    const vatableSales = isVatExempt ? 0 : grossVatableSales;
    const vatExemptSales = isVatExempt ? grossVatableSales : 0;
    const totalDiscountAndDeduction = roundCurrency(computedDiscount + vatDeduction);
    const totalDue = roundCurrency(Math.max(0, grossVatableSales + originalVat - totalDiscountAndDeduction));

    return {
        grossVatableSales,
        vatExemptSales,
        vatableSales,
        vatAmount,
        vatDeduction,
        discountAmount: computedDiscount,
        totalDiscountAndDeduction,
        totalDue,
        isVatExempt,
    };
};

export const calculateReceiptVAT = (totalInclusive: number): VATResult => {
    if (!totalInclusive || totalInclusive <= 0) {
        return {
            vatExclusive: 0,
            vatAmount: 0,
            totalInclusive: 0,
        };
    }

    // Calculate VAT and immediately round it to 2 decimal places
    const rawVatAmount = (totalInclusive / 1.12) * 0.12;
    const vatAmount = roundCurrency(rawVatAmount);

    // Subtract the ROUNDED VAT from the total to prevent 1-cent discrepancies
    const vatExclusive = roundCurrency(totalInclusive - vatAmount);

    return {
        vatExclusive: vatExclusive,
        vatAmount: vatAmount,
        totalInclusive: roundCurrency(totalInclusive),
    };
};

import { calculateReceiptVAT } from './vatCalculator';

describe('VAT Calculation Service (POS-008)', () => {
  it('calculates 12% inclusive VAT correctly for standard amounts', () => {
    const result = calculateReceiptVAT(112);
    
    expect(result.totalInclusive).toBe(112);
    expect(result.vatAmount).toBe(12);
    expect(result.vatExclusive).toBe(100);
  });

  it('calculates correctly with decimal totals (Penny Rounding Check)', () => {
    const result = calculateReceiptVAT(150.50);
    
    // (150.50 / 1.12) * 0.12 = 16.125 -> rounds to 16.13
    expect(result.totalInclusive).toBe(150.50);
    expect(result.vatAmount).toBe(16.13); 
    // 150.50 - 16.13 = 134.37
    expect(result.vatExclusive).toBe(134.37);
  });

  it('EDGE CASE: handles zero totals safely', () => {
    const result = calculateReceiptVAT(0);
    
    expect(result.vatAmount).toBe(0);
    expect(result.vatExclusive).toBe(0);
  });

  it('EDGE CASE: handles negative inputs safely', () => {
    const result = calculateReceiptVAT(-50);
    
    expect(result.vatAmount).toBe(0);
    expect(result.vatExclusive).toBe(0);
  });
});
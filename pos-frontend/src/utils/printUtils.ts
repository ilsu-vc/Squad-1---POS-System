/**
 * printUtils.ts
 * Receipt printing utilities supporting browser printing and expo-print integration
 */

import { calculateTaxDiscountBreakdown, TaxDiscountBreakdown } from './vatCalculator';
import { receiptApi } from '../services/receiptApi';

export interface PrintReceiptData {
  receiptNumber: string | null;
  transactionId: string | null;
  items: Array<{ name: string; quantity: number; price: number; category?: string }>;
  subtotal: number;
  tax: number;
  discountAmount?: number;
  discountType?: string;
  taxBreakdown?: TaxDiscountBreakdown;
  total: number;
  paymentMethod?: string;
  splitPayments?: Array<{
    method: string;
    amount: number;
    refNo?: string;
    cardLast4?: string;
    mobileProvider?: string;
  }>;
  changeAmount?: number;
  customerName?: string;
  storeName?: string;
  storeAddress?: string;
  storeTin?: string;
  storePtin?: string;
  orFields?: {
    name: string;
    tin: string;
    address: string;
  };
  isReprint?: boolean;
}

/**
 * Format currency for receipt display
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Generate HTML for receipt (suitable for printing)
 */
export const generateReceiptHTML = (data: PrintReceiptData): string => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const storeName = data.storeName || 'PharmaCare Drugstore';
  const storeAddress = data.storeAddress || '123 Sample St., Brgy. Example, City, Philippines';
  const storeTin = data.storeTin || '000-000-000-000';
  const storePtin = data.storePtin || '12-345-678-901-001';
  const taxBreakdown = data.taxBreakdown || calculateTaxDiscountBreakdown({
    subtotal: data.subtotal,
    vat: data.tax,
    discountType: data.discountType,
    discountAmount: data.discountAmount,
  });

  let itemsHtml = '';
  data.items.forEach((item) => {
    itemsHtml += `
      <tr>
        <td style="text-align: left; padding: 8px 4px;">${item.name}</td>
        <td style="text-align: center; padding: 8px 4px;">${item.quantity}</td>
        <td style="text-align: right; padding: 8px 4px;">${formatCurrency(item.price)}</td>
        <td style="text-align: right; padding: 8px 4px;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `;
  });

  let paymentHtml = '';
  if (data.splitPayments && data.splitPayments.length > 1) {
    data.splitPayments.forEach((payment) => {
      paymentHtml += `
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span>${payment.method.toUpperCase()}</span>
          <span>${formatCurrency(payment.amount)}</span>
        </div>
      `;
    });
  } else {
    paymentHtml = `<p style="margin: 4px 0;">${data.paymentMethod?.toUpperCase() || 'CASH'}</p>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Receipt ${data.receiptNumber || 'N/A'}</title>
      <style>
        @page {
          margin: 0;
          size: 72mm auto;
        }
        body {
          font-family: 'Courier New', monospace;
          max-width: 72mm;
          margin: 0 auto;
          padding: 2mm 4mm;
          font-size: 10px;
          line-height: 1.2;
          color: #000;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 6px;
          border-bottom: 1px solid #000;
          padding-bottom: 6px;
        }
        .store-name {
          font-size: 12px;
          font-weight: bold;
          margin: 0 0 3px 0;
        }
        .store-address {
          margin: 2px 0;
          font-size: 8px;
        }
        .divider {
          border-top: 1px solid #000;
          margin: 5px 0;
        }
        .divider.dashed {
          border-top: 1px dashed #000;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          padding: 1px 0;
          font-size: 9px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 5px 0;
          font-size: 9px;
        }
        th {
          text-align: left;
          padding: 2px 1px;
          border-bottom: 1px solid #000;
          font-weight: bold;
        }
        td {
          padding: 3px 1px;
          border-bottom: 1px dashed #ddd;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 9px;
        }
        .summary-row.total {
          font-size: 11px;
          font-weight: bold;
          padding: 4px 0;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
        }
        .footer {
          text-align: center;
          margin-top: 6px;
          font-size: 8px;
          padding-top: 6px;
          border-top: 1px solid #000;
        }
        @media print {
          html, body { margin: 0; padding: 2mm 3mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        ${data.isReprint ? `<h3 style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold;">*** REPRINT ***</h3>` : data.orFields ? `<h3 style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold;">OFFICIAL RECEIPT</h3>` : ''}
        <h2 class="store-name">${storeName}</h2>
        <p class="store-address">${storeAddress}</p>
        <p style="margin: 2px 0; font-size: 8px;">TIN: ${storeTin}</p>
        <p style="margin: 2px 0; font-size: 8px;">PTIN: ${storePtin}</p>
      </div>

      <div class="meta-row">
        <span>Receipt #: <strong>${data.receiptNumber || 'N/A'}</strong></span>
      </div>
      <div class="meta-row">
        <span>Txn ID: ${data.transactionId || 'N/A'}</span>
      </div>
      <div class="meta-row">
        <span>${dateStr} ${timeStr}</span>
      </div>
      ${data.customerName ? `<div class="meta-row"><span>Customer: ${data.customerName}</span></div>` : ''}

      ${data.orFields && !data.isReprint ? `
      <div class="divider dashed"></div>
      <div style="font-size: 9px; padding: 1px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Name:</span>
          <strong>${data.orFields.name}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>TIN:</span>
          <strong>${data.orFields.tin}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Address:</span>
          <strong>${data.orFields.address}</strong>
        </div>
      </div>
      ` : ''}

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider dashed"></div>

      <div class="summary-row">
        <span>VATable Sales:</span>
        <span>${formatCurrency(taxBreakdown.vatableSales)}</span>
      </div>
      ${
        taxBreakdown.isVatExempt
          ? `
        <div class="summary-row">
          <span>VAT-Exempt Sales:</span>
          <span>${formatCurrency(taxBreakdown.vatExemptSales)}</span>
        </div>
      `
          : ''
      }
      <div class="summary-row">
        <span>VAT (12%):</span>
        <span>${formatCurrency(taxBreakdown.vatAmount)}</span>
      </div>
      ${
        taxBreakdown.vatDeduction > 0
          ? `
        <div class="summary-row">
          <span>VAT Discount/Deduction:</span>
          <span>-${formatCurrency(taxBreakdown.vatDeduction)}</span>
        </div>
      `
          : ''
      }
      ${
        taxBreakdown.discountAmount > 0
          ? `
        <div class="summary-row">
          <span>Discount ${data.discountType ? `(${data.discountType.toUpperCase()})` : ''}:</span>
          <span>-${formatCurrency(taxBreakdown.discountAmount)}</span>
        </div>
      `
          : ''
      }

      <div class="divider"></div>

      <div class="summary-row total">
        <span>TOTAL DUE:</span>
        <span>${formatCurrency(data.total)}</span>
      </div>

      <div style="padding: 4px 0; font-size: 9px;">
        <strong>Payment:</strong>
        ${paymentHtml}
      </div>

      ${
        data.changeAmount && data.changeAmount > 0
          ? `
        <div class="summary-row">
          <span>Change:</span>
          <span>${formatCurrency(data.changeAmount)}</span>
        </div>
      `
          : ''
      }

      <div class="divider"></div>

      <div class="footer">
        <p style="margin: 3px 0;">Thank you for your purchase!</p>
        <p style="margin: 3px 0; font-size: 8px;">Please keep this receipt for your records.</p>
        <p style="margin: 3px 0; font-size: 7px;">THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Browser-based print using window.print()
 */

export const printReceiptBrowser = async (data: PrintReceiptData): Promise<void> => {
  const html = generateReceiptHTML(data);

  // Create a temporary window/iframe for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Could not open print window');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Trigger print dialog after content loads
  printWindow.onload = () => {
    printWindow.print();
  };
};

/**
 * Expo-print integration (for React Native apps)
 * This is a stub for future Expo integration
 */
export const printReceiptExpo = async (data: PrintReceiptData): Promise<void> => {
  try {
    // Check if expo-print is available (only in Expo/React Native environments)
    // const expoPrint = await import('expo-print').catch(() => null);
    const expoPrint = null; // Temporarily disabled to fix build error

    if (!expoPrint) {

      console.warn('expo-print not available, falling back to browser print');
      return printReceiptBrowser(data);
    }

    const html = generateReceiptHTML(data);

    // Use expo-print to print
    await expoPrint.printAsync({
      html,
      printerUrl: '', // Will prompt user to select printer
    });
  } catch (error) {
    console.error('Expo print error:', error);
    // Fallback to browser print
    return printReceiptBrowser(data);
  }
};

// ── Double-print lock ─────────────────────────────────────────────────────
// Tracks in-flight or recently completed print jobs by receipt key.
// A print for the same key is ignored if called within 3 seconds.
const _printLock = new Map<string, number>();
const PRINT_LOCK_MS = 3000;

/**
 * Smart print function that detects environment and uses appropriate method
 */
export const printReceipt = async (data: PrintReceiptData): Promise<void> => {
  // ── Double-print prevention ──────────────────────────────────────────
  const lockKey = `${data.receiptNumber ?? 'none'}_${data.transactionId ?? 'none'}`;
  const now = Date.now();
  const lastPrint = _printLock.get(lockKey);
  if (lastPrint && now - lastPrint < PRINT_LOCK_MS) {
    console.warn(`[printReceipt] Duplicate print for ${lockKey} blocked (${now - lastPrint}ms since last).`);
    return;
  }
  _printLock.set(lockKey, now);

  try {
    // Attempt backend direct print first (for thermal printer over IP)
    const result = await receiptApi.printReceipt({
      receiptNumber: data.receiptNumber || '000000',
      items: data.items,
      vatable: data.taxBreakdown?.vatableSales,
      vatAmount: data.taxBreakdown?.vatAmount,
      discount: data.taxBreakdown?.discountAmount || data.discountAmount,
      discountType: data.discountType,
      total: data.total,
      paymentMethod: data.paymentMethod,
      amountPaid: data.total + (data.changeAmount || 0), // estimation
      change: data.changeAmount,
      cashier: 'Cashier',
      date: new Date().toLocaleString(),
      storeName: data.storeName,
      storeAddress: data.storeAddress,
      storeTin: data.storeTin,
      splitPayments: data.splitPayments,
      isReprint: data.isReprint ?? false,
      orFields: data.orFields,
    });


    if (result.printed) {
      console.log('Successfully printed via backend directly to Sunmi V2');
      return; // Skip browser print if backend succeeded
    }

    if (result.viaQueue) {
      console.log('Successfully enqueued to Cloud Print Queue. Android POS will pick it up.');
      return; // Skip browser print since it's queued for hardware printing
    }
    
    console.warn('Backend returned not printed and not queued:', result);
    alert('Print failed: Backend returned not printed and not queued.');
    return;
  } catch (error: any) {
    console.error('Backend print failed', error);
    alert('Backend API Print Error: ' + (error?.message || String(error)));
    return;
  }

  // Check if we're in a React Native environment
  if (typeof window !== 'undefined' && !window.print) {
    // React Native environment
    return printReceiptExpo(data);
  }

  // Browser environment
  return printReceiptBrowser(data);
};

/**
 * Download receipt as PDF (for stores without physical printers)
 */
export const downloadReceiptPDF = async (data: PrintReceiptData): Promise<void> => {
  try {
    const jsPDF = (await import('jspdf').then((m) => m.jsPDF)).default;
    const html2canvas = (await import('html2canvas')).default;

    // Create a temporary div with the receipt HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateReceiptHTML(data);
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      logging: false,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // 80mm wide thermal receipt paper
    });

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      80,
      (canvas.height * 80) / canvas.width
    );

    pdf.save(`Receipt-${data.receiptNumber || 'N-A'}.pdf`);

    // Clean up
    document.body.removeChild(tempDiv);
  } catch (error) {
    console.error('PDF download error:', error);
  }
};

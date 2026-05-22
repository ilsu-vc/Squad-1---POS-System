import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

// ── ESC/POS command bytes ──────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:            Buffer.from([ESC, 0x40]),           // Initialize printer
  ALIGN_LEFT:      Buffer.from([ESC, 0x61, 0x00]),     // Left align
  ALIGN_CENTER:    Buffer.from([ESC, 0x61, 0x01]),     // Center align
  ALIGN_RIGHT:     Buffer.from([ESC, 0x61, 0x02]),     // Right align
  BOLD_ON:         Buffer.from([ESC, 0x45, 0x01]),     // Bold text on
  BOLD_OFF:        Buffer.from([ESC, 0x45, 0x00]),     // Bold text off
  FONT_NORMAL:     Buffer.from([ESC, 0x4d, 0x00]),     // Font A (Standard)
  FONT_SMALL:      Buffer.from([ESC, 0x4d, 0x01]),     // Font B (Small)
  CUT_PAPER:       Buffer.from([GS,  0x56, 0x01]),     // Partial cut
  FEED_1:          Buffer.from([ESC, 0x64, 0x01]),     // Feed 1 line
};

const LINE_WIDTH = 32; // Font B on this printer still wraps at 32 chars

// ── Helpers ────────────────────────────────────────────────────────────────
function text(str: string): Buffer {
  return Buffer.from(str, 'ascii');
}

function line(char = '-'): Buffer {
  return text(char.repeat(LINE_WIDTH) + '\n');
}

function row(left: string, right: string): Buffer {
  const leftTrunc = left.slice(0, LINE_WIDTH - right.length - 1);
  const spaces = LINE_WIDTH - leftTrunc.length - right.length;
  return text(leftTrunc + ' '.repeat(Math.max(1, spaces)) + right + '\n');
}

function centerText(str: string): Buffer {
  const pad = Math.max(0, Math.floor((LINE_WIDTH - str.length) / 2));
  return text(' '.repeat(pad) + str + '\n');
}

function wrapText(str: string, maxWidth: number): string[] {
  const words = str.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length <= maxWidth) {
      current += (current ? ' ' : '') + word;
    } else {
      if (current) lines.push(current);
      current = word.slice(0, maxWidth);
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

// ── Printer Service ────────────────────────────────────────────────────────
@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  /**
   * Builds a full ESC/POS receipt buffer and sends it to the printer.
   */
  async printToSunmi(
    printerIp: string,
    data: {
      storeName: string;
      storeAddress: string;
      storeTin: string;
      receiptNumber: string | number;
      date: string;
      cashier?: string;
      items: { name: string; quantity: number; price: number }[];
      vatable: number;
      vatAmount: number;
      discount?: number;
      discountType?: string;
      total: number;
      paymentMethod?: string;
      amountPaid?: number;
      change?: number;
      splitPayments?: { method: string; amount: number }[];
      // ── Receipt type flags ────────────────────────────────────────────────
      isReprint?: boolean;
      orFields?: { name: string; tin: string; address: string };
    },
  ): Promise<void> {
    const chunks: Buffer[] = [];
    const push = (...bufs: Buffer[]) => chunks.push(...bufs);

    const isVatExempt =
      data.discountType &&
      ['senior', 'pwd'].includes(data.discountType.toLowerCase());

    // ── Header ──────────────────────────────────────────────────────────
    push(CMD.INIT);
    push(CMD.FONT_NORMAL); // Revert to standard font so alignment works
    push(CMD.ALIGN_CENTER);

    // ── REPRINT watermark ────────────────────────────────────────────────
    if (data.isReprint) {
      push(CMD.BOLD_ON);
      push(text('*** REPRINT ***\n'));
      push(CMD.BOLD_OFF);
    }

    // ── OFFICIAL RECEIPT label (only on original OR, not reprint) ────────
    if (data.orFields && !data.isReprint) {
      push(CMD.BOLD_ON);
      push(text('OFFICIAL RECEIPT\n'));
      push(CMD.BOLD_OFF);
    }

    push(CMD.BOLD_ON);
    push(text(data.storeName + '\n'));
    push(CMD.BOLD_OFF);
    push(text(data.storeAddress + '\n'));
    push(text('TIN: ' + data.storeTin + '\n'));

    // ── OR Customer Details (only on original OR, not reprint) ──────────
    if (data.orFields && !data.isReprint) {
      push(CMD.ALIGN_LEFT);
      push(line('-'));
      push(CMD.BOLD_ON);
      push(text('Official Receipt Details:\n'));
      push(CMD.BOLD_OFF);
      push(row('Name:', data.orFields.name.slice(0, 30)));
      push(row('TIN:', data.orFields.tin));
      const addrLines = wrapText('Addr: ' + data.orFields.address, LINE_WIDTH);
      for (const al of addrLines) {
        push(text(al + '\n'));
      }
    }

    // ── Meta ─────────────────────────────────────────────────────────────
    push(CMD.ALIGN_LEFT);
    push(line());
    push(row('Receipt #:', String(data.receiptNumber || 'N/A')));
    push(row('Date:', data.date));
    if (data.cashier) push(row('Cashier:', data.cashier));
    push(line('-'));

    // ── Items header ─────────────────────────────────────────────────────
    push(CMD.BOLD_ON);
    push(text('ITEM             QTY    TOTAL\n'));
    push(CMD.BOLD_OFF);
    push(line('-'));

    // ── Items ────────────────────────────────────────────────────────────
    for (const item of data.items) {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      const nameLine = item.name.slice(0, 16).padEnd(16);
      const qtyStr = String(item.quantity).padStart(3);
      const totStr = itemTotal.padStart(11);
      push(text(`${nameLine} ${qtyStr} ${totStr}\n`));
      if (item.quantity > 1) {
        push(text(`  @ P${item.price.toFixed(2)} each\n`));
      }
    }

    push(line('-'));

    // ── Summary ──────────────────────────────────────────────────────────
    if (isVatExempt) {
      push(row('VAT-Exempt Sales:', 'P' + data.vatable.toFixed(2)));
      push(row('VAT (12%):', 'P0.00'));
      push(row('Discount (' + (data.discountType || '').toUpperCase() + '):', '-P' + (data.discount ?? 0).toFixed(2)));
    } else {
      push(row('VATable Sales:', 'P' + data.vatable.toFixed(2)));
      push(row('VAT (12%):', 'P' + data.vatAmount.toFixed(2)));
      if (data.discount && data.discount > 0) {
        const discLabel = data.discountType
          ? `Discount (${data.discountType.toUpperCase()}):`
          : 'Discount:';
        push(row(discLabel, '-P' + data.discount.toFixed(2)));
      }
    }

    push(line());

    // ── Total ────────────────────────────────────────────────────────────
    push(CMD.BOLD_ON);
    push(row('TOTAL AMOUNT DUE:', 'P' + data.total.toFixed(2)));
    push(CMD.BOLD_OFF);
    push(line());

    // ── Payment ──────────────────────────────────────────────────────────
    if (data.splitPayments && data.splitPayments.length > 1) {
      push(text('SPLIT PAYMENT:\n'));
      for (const sp of data.splitPayments) {
        push(row('  ' + sp.method.toUpperCase(), 'P' + Number(sp.amount).toFixed(2)));
      }
    } else {
      push(row('Payment:', (data.paymentMethod || 'Cash').toUpperCase()));
      if (data.amountPaid) push(row('Amount Paid:', 'P' + data.amountPaid.toFixed(2)));
      if (data.change && data.change > 0) push(row('Change:', 'P' + data.change.toFixed(2)));
    }

    push(line());

    // ── Footer ───────────────────────────────────────────────────────────
    push(CMD.ALIGN_CENTER);
    push(text('Thank you for your purchase!\n'));
    push(text('Please keep this receipt for your records.\n'));
    push(text('VALID FOR 5 YEARS FROM DATE OF ATP\n'));

    // ── Feed & Cut ───────────────────────────────────────────────────────
    push(CMD.FEED_1); // Reduced from 3 to 1 to save paper
    push(CMD.CUT_PAPER);

    const receipt = Buffer.concat(chunks);
    await this.sendToSocket(printerIp, 9100, receipt);
  }

  // ── TCP Socket Send ──────────────────────────────────────────────────────
  private sendToSocket(host: string, port: number, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = 5000; // 5 second timeout

      socket.setTimeout(timeout);

      socket.connect(port, host, () => {
        this.logger.log(`Connected to printer at ${host}:${port}`);
        socket.write(data, (err) => {
          if (err) {
            socket.destroy();
            return reject(new Error(`Write error: ${err.message}`));
          }
          socket.end();
          resolve();
          this.logger.log('Receipt sent to printer successfully');
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`Printer connection timed out at ${host}:${port}`));
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(new Error(`Cannot reach printer at ${host}:${port} — ${err.message}`));
      });
    });
  }
}


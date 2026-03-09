// NOTE: 'node-thermal-printer' is a Node.js-only library and cannot be imported
// in a React browser app — it uses native modules (fs, net) that don't exist in
// the browser. The actual print job must be sent from a backend/server endpoint.
//
// This is a browser-safe stub that logs receipt data to the console.
// To wire up real printing, POST the transactionData to your backend API instead.

export interface ReceiptData {
    receiptNumber?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
    vatable?: number;
    vatAmount?: number;
    total?: number;
}

export const printReceipt = async (transactionData: ReceiptData): Promise<boolean> => {
    try {
        console.log("=== RECEIPT (browser stub — connect to backend for real printing) ===");
        console.log("Receipt #:", transactionData.receiptNumber || '000000');
        console.log("Date:", new Date().toLocaleString());
        console.log("Items:", transactionData.items);
        console.log("VATable Sales:", transactionData.vatable?.toFixed(2));
        console.log("VAT Amount (12%):", transactionData.vatAmount?.toFixed(2));
        console.log("TOTAL: PHP", transactionData.total?.toFixed(2));
        console.log("====================================================================");
        return true;
    } catch (error) {
        console.error("Print stub failed:", error);
        return false;
    }
};

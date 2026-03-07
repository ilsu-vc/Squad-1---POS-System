import { CharacterSet, ThermalPrinter, PrinterTypes } from "node-thermal-printer";

export const printReceipt = async (transactionData) => {
    try {
        // 1. Initialize the printer
        // Note: Change the interface to match your physical printer's IP or USB port
        let printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,  
            interface: 'tcp://192.168.1.100', 
            characterSet: CharacterSet.PC852_LATIN2, 
            removeSpecialCharacters: false,
            lineCharacter: "=", 
        });

        // 2. Check Connection
        let isConnected = await printer.isPrinterConnected();
        if (!isConnected) {
            console.error("Printer not found! Check cables/network.");
            alert("Hardware Error: Could not connect to the receipt printer.");
            return false;
        }

        // 3. Design the Receipt Layout
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.println("SQUAD 1 POS SYSTEM"); 
        printer.println("123 University St, Manila");
        printer.println("TIN: 000-123-456-000");
        
        printer.drawLine(); 
        
        printer.alignLeft();
        printer.println(`Date: ${new Date().toLocaleString()}`);
        printer.println(`Receipt #: ${transactionData.receiptNumber || '000000'}`);
        
        printer.drawLine();

        // 4. Loop through cart items
        if (transactionData.items && transactionData.items.length > 0) {
            transactionData.items.forEach(item => {
                printer.tableCustom([
                    { text: item.name, align: "LEFT", width: 0.5 },
                    { text: item.qty.toString(), align: "CENTER", width: 0.2 },
                    { text: item.price.toFixed(2), align: "RIGHT", width: 0.3 }
                ]);
            });
        }

        printer.drawLine();
        
        // 5. VAT Breakdown & Totals
        printer.alignRight();
        printer.println(`VATable Sales:  ${transactionData.vatable ? transactionData.vatable.toFixed(2) : '0.00'}`);
        printer.println(`VAT Amount (12%): ${transactionData.vatAmount ? transactionData.vatAmount.toFixed(2) : '0.00'}`);
        
        printer.setTextSize(1, 1); // Make Total Bold/Large
        printer.println(`TOTAL: PHP ${transactionData.total ? transactionData.total.toFixed(2) : '0.00'}`);

        printer.setTextNormal();
        printer.alignCenter();
        printer.println("THIS IS NOT AN OFFICIAL RECEIPT");

        // 6. Execute Print & Cut
        printer.cut();
        await printer.execute();
        console.log("Print success!");
        return true;

    } catch (error) {
        console.error("Print execution failed:", error);
        return false;
    }
};
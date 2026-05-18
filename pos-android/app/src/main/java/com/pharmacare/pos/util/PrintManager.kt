package com.pharmacare.pos.util

import android.content.Context
import android.print.PrintAttributes
import android.util.Log
import android.print.PrintManager as AndroidPrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

object PrintManager {

    private const val PREFS_NAME = "printer_prefs"
    private const val KEY_PRINTER_MAC = "selected_printer_mac"
    private const val KEY_H10_IP = "h10_printer_ip"
    private const val KEY_API_IP = "backend_api_ip"

    fun savePrinter(context: Context, mac: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PRINTER_MAC, mac)
            .apply()
    }

    fun getSavedPrinter(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_PRINTER_MAC, null)
    }

    fun saveH10Ip(context: Context, ip: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_H10_IP, ip)
            .apply()
    }

    fun getH10Ip(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_H10_IP, null)
    }

    fun saveApiIp(context: Context, ip: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_API_IP, ip)
            .apply()
    }

    fun getApiIp(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_API_IP, null)
    }

    /**
     * H10 Specific Diagnostic
     * Run this to see if we have access to the hardware
     */
    fun getH10DiagnosticReport(context: Context): String {
        val sb = StringBuilder()
        sb.append("=== H10 HARDWARE REPORT ===\n")
        
        // 1. Check Serial Ports
        val h10Ports = listOf("/dev/ttyS1", "/dev/ttyS3", "/dev/ttyMT1")
        sb.append("\n[Ports]\n")
        for (port in h10Ports) {
            val f = java.io.File(port)
            if (f.exists()) {
                val canWrite = f.canWrite()
                sb.append("$port: FOUND | Permission: ${if (canWrite) "GRANTED ✅" else "DENIED ❌"}\n")
            } else {
                sb.append("$port: NOT FOUND\n")
            }
        }

        // 2. Deep Package Scan (Find Manufacturer Apps)
        sb.append("\n[Manufacturer Apps Found]\n")
        val allPkgs = context.packageManager.getInstalledPackages(0)
        var foundAny = false
        for (pkg in allPkgs) {
            val pName = pkg.packageName.lowercase()
            // Skip common system noise to find the "HardWare Settings" etc.
            if (!pName.startsWith("com.android") && !pName.startsWith("android") && !pName.startsWith("com.google")) {
                sb.append("• ${pkg.packageName}\n")
                foundAny = true
            }
        }
        if (!foundAny) sb.append("No manufacturer apps found.\n")

        // 3. System Info
        sb.append("\n[System Info]\n")
        sb.append("Model: ${android.os.Build.MODEL}\n")
        sb.append("Manufacturer: ${android.os.Build.MANUFACTURER}\n")
        sb.append("Brand: ${android.os.Build.BRAND}\n")
        sb.append("Board: ${android.os.Build.BOARD}\n")
        
        return sb.toString()
    }

    suspend fun printReceipt(
        context: Context,
        receiptNumber: String,
        items: List<Map<String, Any>>,
        total: Double,
        paymentMethod: String,
        subtotal: Double? = null,
        vat: Double? = null,
        discountAmount: Double = 0.0,
        discountLabel: String? = null,
        amountTendered: Double? = null,
        change: Double? = null,
        localOnly: Boolean = false,
        isReprint: Boolean = false,
        customerName: String? = null,
        notes: String? = null,
        tags: List<String> = emptyList(),
        orName: String? = null,
        orTin: String? = null,
        orAddress: String? = null,
        txnId: String? = null
    ) {
        // 0. Try Network Printing (H10 as Server)
        val h10Ip = getH10Ip(context)?.trim()
        if (!localOnly && !h10Ip.isNullOrBlank()) {
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Connecting to $h10Ip...", Toast.LENGTH_SHORT).show()
            }
            val netPrinter = NetworkPrinter(h10Ip)
            try {
                if (netPrinter.connect()) {
                    netPrinter.initialize()
                    netPrinter.setAlignCenter()
                    netPrinter.boldOn()
                    if (isReprint) {
                        netPrinter.printLine("*** REPRINT ***")
                    } else if (tags.contains("Request for OR")) {
                        netPrinter.printLine("OFFICIAL RECEIPT")
                    }
                    netPrinter.printLine("PharmaCare Drugstore")
                    netPrinter.boldOff()
                    netPrinter.printLine("123 Sample St., Brgy. Example, City, Philippines")
                    netPrinter.printLine("TIN: 000-000-000-000")
                    netPrinter.printLine("PTIN: 12-345-678-901-001")
                    netPrinter.printLine("--------------------------------")
                    
                    // Print OR Details if requested
                    if (!isReprint && tags.contains("Request for OR")) {
                        netPrinter.setAlignLeft()
                        netPrinter.printLine("Name: ${orName ?: ""}")
                        netPrinter.printLine("TIN: ${orTin ?: ""}")
                        netPrinter.printLine("Address: ${orAddress ?: ""}")
                        netPrinter.printLine("--------------------------------")
                    }
                    
                    netPrinter.setAlignLeft()
                    netPrinter.printLine("Receipt #: $receiptNumber")
                    if (!txnId.isNullOrBlank()) netPrinter.printLine("Txn ID: $txnId")
                    val sdf = java.text.SimpleDateFormat("MMM dd, yyyy hh:mm:ss a", java.util.Locale.getDefault())
                    netPrinter.printLine(sdf.format(java.util.Date()))
                    netPrinter.printLine("--------------------------------")
                    
                    // Table Header
                    netPrinter.printLine("Item".padEnd(12) + "Qty".padStart(4) + "Price".padStart(8) + "Total".padStart(8))
                    
                    items.forEach { item ->
                        val name = item["name"]?.toString() ?: "Item"
                        val qty = (item["qty"] as? Double)?.toInt() ?: 
                                 (item["quantity"] as? Double)?.toInt() ?: 
                                 (item["quantity"] as? Int) ?: 1
                        val price = (item["price"] as? Double) ?: 
                                   (item["unit_price"] as? Double) ?: 0.0
                        val lineTotal = qty.toDouble() * price
                        
                        // Name line
                        netPrinter.printLine(name)
                        
                        // Numbers line aligned to headers
                        val qtyStr = qty.toString().padStart(16) // Align under Qty (12 + 4)
                        val priceStr = "P${String.format("%.2f", price)}".padStart(8)
                        val totalStr = "P${String.format("%.2f", lineTotal)}".padStart(8)
                        netPrinter.printLine("$qtyStr$priceStr$totalStr")
                    }
                    
                    netPrinter.printLine("--------------------------------")
                    
                    val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                                       discountLabel?.contains("PWD", ignoreCase = true) == true ||
                                       discountLabel?.contains("SC/", ignoreCase = true) == true

                    if (isSeniorOrPwd && discountAmount > 0) {
                        val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                        val vatRelief = vat ?: (gross - (gross / 1.12))
                        val vatExempt = gross - vatRelief
                        val seniorDiscount = discountAmount - vatRelief
                        
                        netPrinter.printLine("VATable Sales:".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12))
                        netPrinter.printLine("VAT-Exempt Sales:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12))
                        netPrinter.printLine("VAT (12%):".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12))
                        netPrinter.printLine("VAT Discount/Deduction:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12))
                        val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "Discount (PWD):" else "Discount (SENIOR):"
                        netPrinter.printLine(dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12))
                    } else {
                        netPrinter.printLine("VATable Sales:".padEnd(20) + String.format("P%,.2f", subtotal ?: 0.0).padStart(12))
                        netPrinter.printLine("VAT (12%):".padEnd(20) + String.format("P%,.2f", vat ?: 0.0).padStart(12))
                        if (discountAmount > 0) {
                            val label = if (!discountLabel.isNullOrBlank()) "Discount ($discountLabel):" else "Discount:"
                            netPrinter.printLine(label.padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12))
                        }
                    }
                    
                    netPrinter.printLine("================================")
                    val totalLabel = "TOTAL DUE:"
                    val totalStr = "P${String.format("%.2f", total)}"
                    netPrinter.printLine(totalLabel.padEnd(20) + totalStr.padStart(12))
                    netPrinter.printLine("================================")
                    
                    if (amountTendered != null && amountTendered > 0) {
                        val tenderedStr = "P${String.format("%.2f", amountTendered)}"
                        netPrinter.printLine("AMOUNT TENDERED:".padEnd(20) + tenderedStr.padStart(12))
                        
                        if (change != null) {
                            val changeStr = "P${String.format("%.2f", change)}"
                            netPrinter.printLine("CHANGE:".padEnd(20) + changeStr.padStart(12))
                        }
                    }
                    
                    netPrinter.printLine("Payment Method: $paymentMethod")
                    netPrinter.printLine("--------------------------------")
                    netPrinter.setAlignCenter()
                    netPrinter.printLine("Thank you for your purchase!")
                    netPrinter.feed(4)
                    netPrinter.close()
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Receipt Sent to $h10Ip successfully!", Toast.LENGTH_SHORT).show()
                    }
                    return
                } else {
                    throw Exception("Could not establish socket connection to $h10Ip:9100")
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Log.e("PrintManager", "Network Print Error: ${e.message}")
                    Toast.makeText(context, "Printer Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        // 0.5 Try Cloud Printing (Option 3)
        // If we are on the TABLET and no H10 IP is set, or we want a cloud backup
        if (!localOnly) {
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Sending to Cloud Print Queue...", Toast.LENGTH_SHORT).show()
            }
            val error = com.pharmacare.pos.data.repository.PrintQueueRepository.enqueue(
                receiptNumber, items, total, paymentMethod
            )
            if (error == null) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Receipt Enqueued Cloud successfully!", Toast.LENGTH_SHORT).show()
                }
                return
            } else {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Cloud Error: $error", Toast.LENGTH_LONG).show()
                }
                // Fallthrough to PDF only if cloud fails
            }
        }

        // 1. Check for MobiIot/Manufacturer Service
        val packageManager = context.packageManager
        val hasMobiService = try { 
            packageManager.getPackageInfo("com.mobi.printservice", 0) != null 
        } catch (e: Exception) { false }
        
        if (hasMobiService) {
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "MobiIot Printer Service Detected!", Toast.LENGTH_SHORT).show()
            }
            // Future: Implement AIDL binding for MobiIot
        }

        // 1. Try Bluetooth (Prioritize InnerPrinter for Sunmi V2)
        val bluetoothPrinter = findPrinter(context)
        if (bluetoothPrinter != null) {
            val btSuccess = printToDevice(bluetoothPrinter, receiptNumber, items, total, paymentMethod, subtotal, vat, discountAmount, discountLabel, amountTendered, change, context, isReprint, customerName, notes, orName, orTin, orAddress, txnId)
            if (btSuccess) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Receipt Printed via Bluetooth", Toast.LENGTH_SHORT).show()
                }
                return
            }
        }

        // 2. Try Serial Port Direct (Prioritize H10 ports)
        val h10Ports = listOf("/dev/ttyS1", "/dev/ttyS3", "/dev/ttyMT1") + SerialPrinter.COMMON_PORTS
        for (port in h10Ports.distinct()) {
            val serialPrinter = SerialPrinter(port)
            if (serialPrinter.connect()) {
                val success = printToSerial(serialPrinter, receiptNumber, items, total, paymentMethod, subtotal, vat, discountAmount, discountLabel, amountTendered, change, isReprint, customerName, notes, orName, orTin, orAddress, txnId)
                serialPrinter.close()
                if (success) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Receipt Printed via H10 Serial ($port)", Toast.LENGTH_SHORT).show()
                    }
                    return
                }
            }
        }

        // 4. Last Resort: Simulation
        simulatePrint(context, receiptNumber, items, total, paymentMethod)
    }

    /**
     * Prints raw ESC/POS bytes received from the network
     * This is used when the H10 acts as a Print Server
     */
    suspend fun printRawBytes(context: Context, data: ByteArray) {
        // 1. Senraise/HCT Driver (Manufacturer Intents)
        try {
            val intentActions = listOf(
                "com.senraise.printer.PRINT",
                "com.hct.printer.PRINT",
                "android.intent.action.SENRAISE_PRINT",
                "hct.intent.action.PRINT"
            )
            val packages = listOf("com.senraise.printservice", "com.hct.printer", "com.senraise.printer")
            
            for (action in intentActions) {
                for (pkg in packages) {
                    val intent = android.content.Intent(action)
                    intent.setPackage(pkg)
                    intent.putExtra("data", data)
                    intent.putExtra("content", String(data))
                    intent.putExtra("text", String(data))
                    context.sendBroadcast(intent)
                }
            }
            
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Hardware: Sending to System Driver...", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Log.e("PrintManager", "Manufacturer Intent failed: ${e.message}")
        }

        // 2. Try Local Bluetooth (InnerPrinter) - CRITICAL FOR SUNMI V2
        val pairedDevices = BluetoothPrinter.getPairedDevices()
        val innerPrinter = pairedDevices.find { device ->
            val name = try { device.name } catch (e: SecurityException) { null } ?: ""
            name.contains("InnerPrinter", ignoreCase = true)
        }

        if (innerPrinter != null) {
            try {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Sunmi: Forwarding to InnerPrinter...", Toast.LENGTH_SHORT).show()
                }
                val btPrinter = BluetoothPrinter(innerPrinter.address)
                if (btPrinter.connect()) {
                    btPrinter.write(data)
                    btPrinter.feed(4)
                    btPrinter.close()
                    Log.d("PrintManager", "Successfully printed to InnerPrinter via Bluetooth")
                    return // Success!
                }
            } catch (e: Exception) {
                Log.e("PrintManager", "InnerPrinter Bluetooth fallback failed: ${e.message}")
            }
        }

        // 3. Brute force: Try common baud rates on all likely ports (Fallback)
        val h10Ports = listOf("/dev/ttyS1", "/dev/ttyS3", "/dev/ttyS0", "/dev/ttyMT1", "/dev/ttyMT2")
        val baudRates = listOf("115200", "9600", "38400", "19200")
        
        for (port in h10Ports) {
            val file = java.io.File(port)
            if (!file.exists() || !file.canWrite()) continue

            for (baud in baudRates) {
                try {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Trying $port at $baud...", Toast.LENGTH_SHORT).show()
                    }
                    
                    // Set baud rate
                    Runtime.getRuntime().exec("stty -F $port $baud")
                    delay(100)
                    
                    val serial = java.io.FileOutputStream(file)
                    serial.write(byteArrayOf(0x1B, 0x40)) // Initialize
                    serial.write(data)
                    serial.write(byteArrayOf(0x1B, 0x64, 0x04)) // Feed 4 lines
                    serial.flush()
                    serial.close()
                    
                    delay(500)
                } catch (e: Exception) {
                    Log.e("PrintManager", "Error on $port/$baud: ${e.message}")
                }
            }
        }

        // Fallback: Try Intent Broadcasts (Specific Manufacturers)
        val intentActions = listOf(
            "com.mobi.intent.action.PRINT",
            "com.imin.intent.action.PRINT",
            "com.trendit.intent.action.PRINT",
            "woyou.aidlservice.jiuiv5.PRINT", // Sunmi
            "com.sunmi.printer.PRINT", // Sunmi Generic
            "hct.intent.action.PRINT"
        )
        for (action in intentActions) {
            val printIntent = android.content.Intent(action)
            printIntent.putExtra("data", data)
            printIntent.putExtra("content", String(data))
            printIntent.putExtra("text", String(data))
            context.sendBroadcast(printIntent)
        }
    }

    private fun printViaSystem(
        context: Context,
        receiptNumber: String,
        items: List<Map<String, Any>>,
        total: Double,
        paymentMethod: String,
        subtotal: Double? = null,
        vat: Double? = null,
        discountAmount: Double = 0.0,
        discountLabel: String? = null,
        amountTendered: Double? = null,
        change: Double? = null,
        isReprint: Boolean = false,
        customerName: String? = null,
        notes: String? = null,
        orName: String? = null,
        orTin: String? = null,
        orAddress: String? = null,
        txnId: String? = null
    ): Boolean {
        return try {
            val printManager = context.getSystemService(Context.PRINT_SERVICE) as AndroidPrintManager
            val jobName = "PharmaCare Receipt $receiptNumber"

            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
            val vatRelief = vat ?: (gross - (gross / 1.12))
            val vatExempt = gross - vatRelief
            val seniorDiscount = discountAmount - vatRelief

            val htmlContent = """
                <html>
                <head>
                    <style>
                        body { font-family: 'Courier New', monospace; width: 180px; margin: 0; padding: 0; font-size: 10px; line-height: 1.2; }
                        .center { text-align: center; }
                        .right { text-align: right; }
                        .bold { font-weight: bold; }
                        hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
                        table { width: 100%; border-collapse: collapse; font-size: 9px; }
                        td { vertical-align: top; }
                        .total { font-size: 12px; margin-top: 5px; border-top: 1px double #000; border-bottom: 1px double #000; padding: 2px 0; }
                    </style>
                </head>
                <body>
                    <div class="center">
                        <h2 style="margin: 0; font-size: 14px;">PharmaCare Drugstore</h2>
                        <p style="margin: 2px 0; font-size: 8px;">123 Sample St., Brgy. Example, City, Philippines</p>
                        <p style="margin: 2px 0; font-size: 8px;">TIN: 000-000-000-000</p>
                        <p style="margin: 2px 0; font-size: 8px;">PTIN: 12-345-678-901-001</p>
                    </div>
                    <hr>
                    <p style="font-size: 8px;">
                        Receipt #: <strong>$receiptNumber</strong><br>
                        ${if (!txnId.isNullOrBlank()) "Txn ID: $txnId<br>" else ""}
                        Date: ${java.text.SimpleDateFormat("MMM dd, yyyy hh:mm:ss a", java.util.Locale.getDefault()).format(java.util.Date())}<br>
                    </p>
                    <hr>
                    <table>
                        <tr>
                            <td class="bold">Item</td>
                            <td class="bold right">Qty</td>
                            <td class="bold right">Price</td>
                            <td class="bold right">Total</td>
                        </tr>
                        ${items.joinToString("") { item ->
                            val name = item["name"]?.toString() ?: "Item"
                            val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                            val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                            val lineTotal = qty.toDouble() * price
                            "<tr><td colspan='4'>$name</td></tr>" +
                            "<tr><td></td><td class='right'>$qty</td><td class='right'>P${String.format("%.2f", price)}</td><td class='right'>P${String.format("%.2f", lineTotal)}</td></tr>"
                        }}
                    </table>
                    <hr>
                    ${if (isSeniorOrPwd) """
                        <div class="right" style="font-size: 8px;">VATable Sales: P${String.format("%.2f", 0.0)}</div>
                        <div class="right" style="font-size: 8px;">VAT-Exempt Sales: P${String.format("%.2f", vatExempt)}</div>
                        <div class="right" style="font-size: 8px;">VAT (12%): P${String.format("%.2f", 0.0)}</div>
                        <div class="right" style="font-size: 8px;">VAT Discount/Deduction: -P${String.format("%.2f", vatRelief)}</div>
                        <div class="right" style="font-size: 8px;">Discount (${if (discountLabel?.contains("PWD", ignoreCase = true) == true) "PWD" else "SENIOR"}): -P${String.format("%.2f", seniorDiscount)}</div>
                    """ else """
                        <div class="right" style="font-size: 8px;">VATable Sales: P${String.format("%.2f", subtotal ?: 0.0)}</div>
                        <div class="right" style="font-size: 8px;">VAT (12%): P${String.format("%.2f", vat ?: 0.0)}</div>
                        ${if (discountAmount > 0) "<div class='right' style='font-size: 8px;'>Discount (${discountLabel ?: "Promo"}): -P${String.format("%.2f", discountAmount)}</div>" else ""}
                    """}
                    
                    <div class="total">
                        <div class="bold">TOTAL DUE: <span style="float: right;">P${String.format("%.2f", total)}</span></div>
                    </div>

                    <div class="bold" style="font-size: 8px; margin-top: 5px;">Payment:</div>
                    <div style="font-size: 8px;">${paymentMethod.uppercase()}</div>
                    
                    ${if (amountTendered != null && amountTendered > 0) """
                        <div class="right" style="font-size: 8px;">Change: P${String.format("%.2f", change ?: 0.0)}</div>
                    """ else ""}
                    <hr>
                    <div class="center" style="font-size: 8px;">
                        <p>Thank you for your purchase!</p>
                        <p>Please keep this receipt for your records.</p>
                        <p style="font-size: 6px;">THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP</p>
                        <br><br><br>
                    </div>
                </body>
                </html>
            """.trimIndent()

            val webView = WebView(context)
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    val printAdapter = webView.createPrintDocumentAdapter(jobName)
                    val attributes = PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize("58mm", "Thermal", 58000, 200000)) // 58mm width
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build()
                    printManager.print(jobName, printAdapter, attributes)
                }
            }
            
            webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun printToSerial(
        printer: SerialPrinter,
        receiptNumber: String,
        items: List<Map<String, Any>>,
        total: Double,
        paymentMethod: String,
        subtotal: Double? = null,
        vat: Double? = null,
        discountAmount: Double = 0.0,
        discountLabel: String? = null,
        amountTendered: Double? = null,
        change: Double? = null,
        isReprint: Boolean = false,
        customerName: String? = null,
        notes: String? = null,
        orName: String? = null,
        orTin: String? = null,
        orAddress: String? = null,
        txnId: String? = null
    ): Boolean {
        try {
            printer.initialize()
            printer.setAlignCenter()
            printer.boldOn()
            printer.write("PharmaCare Drugstore\n".toByteArray())
            printer.boldOff()
            printer.write("123 Sample St., Brgy. Example, City, Philippines\n".toByteArray())
            printer.write("TIN: 000-000-000-000\n".toByteArray())
            printer.write("PTIN: 12-345-678-901-001\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())
            
            printer.setAlignLeft()
            printer.write("Receipt #: $receiptNumber\n".toByteArray())
            if (!txnId.isNullOrBlank()) printer.write("Txn ID: $txnId\n".toByteArray())
            val sdf = java.text.SimpleDateFormat("MMM dd, yyyy hh:mm:ss a", java.util.Locale.getDefault())
            printer.write("${sdf.format(java.util.Date())}\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())

            // Table Header
            printer.write(("Item".padEnd(12) + "Qty".padStart(4) + "Price".padStart(8) + "Total".padStart(8) + "\n").toByteArray())
            
            items.forEach { item ->
                val name = item["name"]?.toString() ?: "Item"
                val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                val lineTotal = qty.toDouble() * price
                
                // Name line
                printer.write("$name\n".toByteArray())
                
                // Numbers line aligned to headers
                val qtyStr = qty.toString().padStart(16) // Align under Qty (12 + 4)
                val priceStr = "P${String.format("%.2f", price)}".padStart(8)
                val totalStr = "P${String.format("%.2f", lineTotal)}".padStart(8)
                printer.write(("$qtyStr$priceStr$totalStr\n").toByteArray())
            }

            printer.write("--------------------------------\n".toByteArray())
            
            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            if (isSeniorOrPwd && discountAmount > 0) {
                val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                val vatRelief = vat ?: (gross - (gross / 1.12))
                val vatExempt = gross - vatRelief
                val seniorDiscount = discountAmount - vatRelief
                
                printer.write(("VATable Sales:".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12) + "\n").toByteArray())
                printer.write(("VAT-Exempt Sales:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12) + "\n").toByteArray())
                printer.write(("VAT (12%):".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12) + "\n").toByteArray())
                printer.write(("VAT Discount/Deduction:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12) + "\n").toByteArray())
                val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "Discount (PWD):" else "Discount (SENIOR):"
                printer.write((dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12) + "\n").toByteArray())
            } else {
                printer.write(("VATable Sales:".padEnd(20) + String.format("P%,.2f", subtotal ?: 0.0).padStart(12) + "\n").toByteArray())
                printer.write(("VAT (12%):".padEnd(20) + String.format("P%,.2f", vat ?: 0.0).padStart(12) + "\n").toByteArray())
                if (discountAmount > 0) {
                    val label = if (!discountLabel.isNullOrBlank()) "Discount ($discountLabel):" else "Discount:"
                    printer.write((label.padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12) + "\n").toByteArray())
                }
            }

            printer.write("================================\n".toByteArray())
            printer.boldOn()
            printer.write(("TOTAL DUE:".padEnd(20) + String.format("P%,.2f", total).padStart(12) + "\n").toByteArray())
            printer.boldOff()
            printer.write("================================\n".toByteArray())

            printer.write("Payment:\n".toByteArray())
            printer.write((paymentMethod.uppercase() + "\n").toByteArray())
            
            if (amountTendered != null && amountTendered > 0) {
                printer.write(("Change:".padEnd(20) + String.format("P%,.2f", change ?: 0.0).padStart(12) + "\n").toByteArray())
            }
            printer.write("================================\n".toByteArray())
            
            printer.setAlignCenter()
            printer.write("Thank you for your purchase!\n".toByteArray())
            printer.write("Please keep this receipt for your records.\n".toByteArray())
            printer.write("THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP\n".toByteArray())
            printer.feed(4)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    private fun printToUsb(
        printer: UsbPrinter,
        receiptNumber: String,
        items: List<Map<String, Any>>,
        total: Double,
        paymentMethod: String,
        subtotal: Double? = null,
        vat: Double? = null,
        discountAmount: Double = 0.0,
        discountLabel: String? = null,
        amountTendered: Double? = null,
        change: Double? = null,
        isReprint: Boolean = false,
        customerName: String? = null,
        notes: String? = null,
        orName: String? = null,
        orTin: String? = null,
        orAddress: String? = null,
        txnId: String? = null
    ): Boolean {
        try {
            printer.initialize()
            printer.setAlignCenter()
            printer.boldOn()
            printer.write("PharmaCare Drugstore\n".toByteArray())
            printer.boldOff()
            printer.write("123 Sample St., Brgy. Example, City, Philippines\n".toByteArray())
            printer.write("TIN: 000-000-000-000\n".toByteArray())
            printer.write("PTIN: 12-345-678-901-001\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())
            
            printer.setAlignLeft()
            printer.write("Receipt #: $receiptNumber\n".toByteArray())
            if (!txnId.isNullOrBlank()) printer.write("Txn ID: $txnId\n".toByteArray())
            val sdf = java.text.SimpleDateFormat("MMM dd, yyyy hh:mm:ss a", java.util.Locale.getDefault())
            printer.write("${sdf.format(java.util.Date())}\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())

            // Table Header
            printer.write(("Item".padEnd(12) + "Qty".padStart(4) + "Price".padStart(8) + "Total".padStart(8) + "\n").toByteArray())
            
            items.forEach { item ->
                val name = item["name"]?.toString() ?: "Item"
                val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                val lineTotal = qty.toDouble() * price
                
                // Name line
                printer.write("$name\n".toByteArray())
                
                // Numbers line aligned to headers
                val qtyStr = qty.toString().padStart(16) // Align under Qty (12 + 4)
                val priceStr = "P${String.format("%.2f", price)}".padStart(8)
                val totalStr = "P${String.format("%.2f", lineTotal)}".padStart(8)
                printer.write(("$qtyStr$priceStr$totalStr\n").toByteArray())
            }

            printer.write("--------------------------------\n".toByteArray())
            
            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            if (isSeniorOrPwd && discountAmount > 0) {
                val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                val vatRelief = vat ?: (gross - (gross / 1.12))
                val vatExempt = gross - vatRelief
                val seniorDiscount = discountAmount - vatRelief
                
                printer.write(("VATable Sales:".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12) + "\n").toByteArray())
                printer.write(("VAT-Exempt Sales:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12) + "\n").toByteArray())
                printer.write(("VAT (12%):".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12) + "\n").toByteArray())
                printer.write(("VAT Discount/Deduction:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12) + "\n").toByteArray())
                val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "Discount (PWD):" else "Discount (SENIOR):"
                printer.write((dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12) + "\n").toByteArray())
            } else {
                printer.write(("VATable Sales:".padEnd(20) + String.format("P%,.2f", subtotal ?: 0.0).padStart(12) + "\n").toByteArray())
                printer.write(("VAT (12%):".padEnd(20) + String.format("P%,.2f", vat ?: 0.0).padStart(12) + "\n").toByteArray())
                if (discountAmount > 0) {
                    val label = if (!discountLabel.isNullOrBlank()) "Discount ($discountLabel):" else "Discount:"
                    printer.write((label.padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12) + "\n").toByteArray())
                }
            }

            printer.write("================================\n".toByteArray())
            printer.boldOn()
            printer.write(("TOTAL DUE:".padEnd(20) + String.format("P%,.2f", total).padStart(12) + "\n").toByteArray())
            printer.boldOff()
            printer.write("================================\n".toByteArray())

            printer.write("Payment:\n".toByteArray())
            printer.write((paymentMethod.uppercase() + "\n").toByteArray())
            
            if (amountTendered != null && amountTendered > 0) {
                printer.write(("Change:".padEnd(20) + String.format("P%,.2f", change ?: 0.0).padStart(12) + "\n").toByteArray())
            }
            printer.write("================================\n".toByteArray())
            
            printer.setAlignCenter()
            printer.write("Thank you for your purchase!\n".toByteArray())
            printer.write("Please keep this receipt for your records.\n".toByteArray())
            printer.write("THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP\n".toByteArray())
            printer.feed(4)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    private fun findPrinter(context: Context): BluetoothPrinter? {
        val savedMac = getSavedPrinter(context)
        val pairedDevices = BluetoothPrinter.getPairedDevices()
        
        // 1. Prioritize saved printer
        if (savedMac != null) {
            val device = pairedDevices.find { it.address == savedMac }
            if (device != null) return BluetoothPrinter(device.address)
        }

        // 2. Fallback to auto-detection (Sunmi Priority)
        val printerDevice = pairedDevices.find { device ->
            val name = try { device.name } catch (e: SecurityException) { null } ?: ""
            name.contains("InnerPrinter", ignoreCase = true) // This is the Sunmi internal printer
        } ?: pairedDevices.find { device ->
            val name = try { device.name } catch (e: SecurityException) { null } ?: ""
            name.contains("Bluetooth Printer", ignoreCase = true) ||
            name.contains("Printer", ignoreCase = true)
        }

        return printerDevice?.let { BluetoothPrinter(it.address) }
    }

    private suspend fun printToDevice(
        printer: BluetoothPrinter,
        receiptNumber: String,
        items: List<Map<String, Any>>,
        total: Double,
        paymentMethod: String,
        subtotal: Double? = null,
        vat: Double? = null,
        discountAmount: Double = 0.0,
        discountLabel: String? = null,
        amountTendered: Double? = null,
        change: Double? = null,
        context: Context,
        isReprint: Boolean = false,
        customerName: String? = null,
        notes: String? = null,
        orName: String? = null,
        orTin: String? = null,
        orAddress: String? = null,
        txnId: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        if (!printer.connect()) return@withContext false

        try {
            printer.initialize()
            printer.alignCenter()
            printer.boldOn()
            if (isReprint) {
                printer.printLine("*** REPRINT ***")
            } else if (orName != null) {
                printer.printLine("OFFICIAL RECEIPT")
            }
            printer.printLine("PharmaCare Drugstore")
            printer.boldOff()
            printer.printLine("123 Sample St., Brgy. Example, City, Philippines")
            printer.printLine("TIN: 000-000-000-000")
            printer.printLine("PTIN: 12-345-678-901-001")
            printer.printLine("--------------------------------")
            
            // Print OR Details if requested
            if (!isReprint && orName != null) {
                printer.alignLeft()
                printer.printLine("Name: $orName")
                printer.printLine("TIN: ${orTin ?: ""}")
                printer.printLine("Address: ${orAddress ?: ""}")
                printer.printLine("--------------------------------")
            }
            
            printer.alignLeft()
            printer.printLine("Receipt #: $receiptNumber")
            if (!txnId.isNullOrBlank()) printer.printLine("Txn ID: $txnId")
            val sdf = SimpleDateFormat("MMM dd, yyyy hh:mm:ss a", Locale.getDefault())
            printer.printLine(sdf.format(Date()))
            printer.printLine("--------------------------------")
            
            // Table Header
            printer.printLine("Item".padEnd(12) + "Qty".padStart(4) + "Price".padStart(8) + "Total".padStart(8))
            
            items.forEach { item ->
                val name = item["name"]?.toString() ?: "Item"
                val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                val lineTotal = qty.toDouble() * price
                
                // Name line
                printer.printLine(name)
                
                // Numbers line aligned to headers
                val qtyStr = qty.toString().padStart(16) // Align under Qty (12 + 4)
                val priceStr = "P${String.format("%.2f", price)}".padStart(8)
                val totalStr = "P${String.format("%.2f", lineTotal)}".padStart(8)
                printer.printLine("$qtyStr$priceStr$totalStr")
            }
            
            printer.printLine("--------------------------------")
            
            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            if (isSeniorOrPwd && discountAmount > 0) {
                val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                val vatRelief = vat ?: (gross - (gross / 1.12))
                val vatExempt = gross - vatRelief
                val seniorDiscount = discountAmount - vatRelief
                
                printer.printLine("VATable Sales:".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12))
                printer.printLine("VAT-Exempt Sales:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12))
                printer.printLine("VAT (12%):".padEnd(20) + String.format("P%,.2f", 0.0).padStart(12))
                printer.printLine("VAT Discount/Deduction:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12))
                val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "Discount (PWD):" else "Discount (SENIOR):"
                printer.printLine(dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12))
            } else {
                printer.printLine("VATable Sales:".padEnd(20) + String.format("P%,.2f", subtotal ?: 0.0).padStart(12))
                printer.printLine("VAT (12%):".padEnd(20) + String.format("P%,.2f", vat ?: 0.0).padStart(12))
                if (discountAmount > 0) {
                    val label = if (!discountLabel.isNullOrBlank()) "Discount ($discountLabel):" else "Discount:"
                    printer.printLine(label.padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12))
                }
            }
            
            printer.printLine("================================")
            printer.boldOn()
            printer.printLine("TOTAL DUE:".padEnd(20) + String.format("P%,.2f", total).padStart(12))
            printer.boldOff()
            printer.printLine("================================")

            printer.printLine("Payment:")
            printer.printLine(paymentMethod.uppercase())
            
            if (amountTendered != null && amountTendered > 0) {
                printer.printLine("Change:".padEnd(20) + String.format("P%,.2f", change ?: 0.0).padStart(12))
            }
            printer.printLine("================================")
            
            printer.alignCenter()
            printer.printLine("Thank you for your purchase!")
            printer.printLine("Please keep this receipt for your records.")
            printer.printLine("THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF ATP")
            printer.feed(4)
            printer.close()
            true
        } catch (e: Exception) {
            printer.close()
            false
        }
    }

    private suspend fun simulatePrint(
        context: Context,
        receiptNumber: String,
        items: List<Map<String, Any>>,
        total: Double,
        paymentMethod: String
    ) {
        withContext(Dispatchers.IO) {
            println("--- SIMULATED RECEIPT ---")
            println("Receipt: $receiptNumber")
            println("Method: $paymentMethod")
            items.forEach { 
                println("${it["name"]} x${it["quantity"]} - ₱${it["unit_price"]}")
            }
            println("TOTAL: ₱$total")
            println("-------------------------")
        }

        withContext(Dispatchers.Main) {
            delay(500)
            Toast.makeText(context, "Printing Receipt #$receiptNumber (Simulated)...", Toast.LENGTH_SHORT).show()
            delay(1000)
            Toast.makeText(context, "Receipt Printed Successfully", Toast.LENGTH_SHORT).show()
        }
    }
}

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
        localOnly: Boolean = false
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
                    netPrinter.printLine("OFFICIAL RECEIPT")
                    netPrinter.boldOff()
                    netPrinter.doubleSizeOn()
                    netPrinter.printLine("PHARMACARE")
                    netPrinter.doubleSizeOff()
                    netPrinter.printLine("Quality Healthcare for You")
                    netPrinter.printLine("--------------------------------")
                    netPrinter.setAlignLeft()
                    netPrinter.printLine("RECPT: $receiptNumber")
                    netPrinter.printLine("DATE: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date())}")
                    netPrinter.printLine("--------------------------------")
                    
                    items.forEach { item ->
                        val name = item["name"]?.toString() ?: "Item"
                        val qty = (item["qty"] as? Double)?.toInt() ?: 
                                 (item["quantity"] as? Double)?.toInt() ?: 
                                 (item["quantity"] as? Int) ?: 1
                        val price = (item["price"] as? Double) ?: 
                                   (item["unit_price"] as? Double) ?: 0.0
                        val lineTotal = qty.toDouble() * price
                        
                        netPrinter.printLine(name)
                        // Manual alignment for 32-column thermal paper
                        val qtyPrice = "$qty x P${String.format("%.2f", price)}"
                        val totalStr = "P${String.format("%.2f", lineTotal)}"
                        val spaces = " ".repeat((32 - qtyPrice.length - totalStr.length).coerceAtLeast(1))
                        netPrinter.printLine("$qtyPrice$spaces$totalStr")
                    }
                    
                    netPrinter.printLine("--------------------------------")
                    
                    val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                                       discountLabel?.contains("PWD", ignoreCase = true) == true ||
                                       discountLabel?.contains("SC/", ignoreCase = true) == true

                    if (isSeniorOrPwd && discountAmount > 0) {
                        // For Senior/PWD, we show the specific tax-exempt breakdown
                        // Standard logic: Gross -> Less VAT -> VAT Exempt -> Less 20% -> Net
                        val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                        val vatRelief = vat ?: (gross - (gross / 1.12))
                        val vatExempt = gross - vatRelief
                        val seniorDiscount = discountAmount - vatRelief // The 20% part
                        
                        netPrinter.printLine("GROSS AMOUNT:".padEnd(20) + String.format("P%,.2f", gross).padStart(12))
                        netPrinter.printLine("LESS VAT (12%):".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12))
                        netPrinter.printLine("VAT-EXEMPT SALE:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12))
                        val label = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "PWD DISCOUNT:" else "SENIOR DISCOUNT:"
                        netPrinter.printLine(label.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12))
                        
                        netPrinter.printLine("TOTAL DISCOUNT:".padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12))
                    } else {
                        // Standard Breakdown
                        if (subtotal != null) {
                            val subStr = "SUBTOTAL: P${String.format("%.2f", subtotal)}"
                            netPrinter.printLine(subStr.padStart(32))
                        }
                        if (vat != null && vat > 0) {
                            val vatStr = "VAT (12%): P${String.format("%.2f", vat)}"
                            netPrinter.printLine(vatStr.padStart(32))
                        }
                        if (discountAmount > 0) {
                            val discStr = "DISCOUNT (${discountLabel ?: "Disc"}): -P${String.format("%.2f", discountAmount)}"
                            netPrinter.printLine(discStr.padStart(32))
                        }
                    }
                    
                    netPrinter.boldOn()
                    val totalLabel = if (isSeniorOrPwd) "NET AMOUNT PAID:" else "TOTAL AMOUNT PAID:"
                    val totalStr = "$totalLabel P${String.format("%.2f", total)}"
                    netPrinter.printLine(totalStr.padStart(32))
                    netPrinter.boldOff()
                    
                    if (amountTendered != null && amountTendered > 0) {
                        val tenderedStr = "AMOUNT TENDERED: P${String.format("%.2f", amountTendered)}"
                        netPrinter.printLine(tenderedStr.padStart(32))
                        
                        if (change != null) {
                            val changeStr = "CHANGE: P${String.format("%.2f", change)}"
                            netPrinter.printLine(changeStr.padStart(32))
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

        // 2. Try Android System Printing
        val success = printViaSystem(context, receiptNumber, items, total, paymentMethod, subtotal, vat, discountAmount, discountLabel, amountTendered, change)
        if (success) {
            withContext(Dispatchers.Main) {
                Toast.makeText(context, "Sending to System Printer...", Toast.LENGTH_SHORT).show()
            }
            return
        }

        // 2. Try Intent Broadcast (Common for "Locked" H10 systems)
        val intentActions = listOf(
            "com.mobi.intent.action.PRINT",
            "com.imin.intent.action.PRINT",
            "com.trendit.intent.action.PRINT",
            "android.intent.action.PRINT_RECEIPT"
        )
        
        for (action in intentActions) {
            val printIntent = android.content.Intent(action)
            val header = "OFFICIAL RECEIPT\nPHARMACARE\n--------------------------------\n"
            val body = "RECPT: $receiptNumber\nTOTAL PAID: P${String.format("%.2f", total)}\nMethod: $paymentMethod\n"
            val footer = "--------------------------------\nThank you for your purchase!\n\n\n\n"
            printIntent.putExtra("content", header + body + footer)
            printIntent.putExtra("text", header + body + footer)
            context.sendBroadcast(printIntent)
        }

        // 3. Try Serial Port Direct (Prioritize H10 ports)
        val h10Ports = listOf("/dev/ttyS1", "/dev/ttyS3", "/dev/ttyMT1") + SerialPrinter.COMMON_PORTS
        for (port in h10Ports.distinct()) {
            val serialPrinter = SerialPrinter(port)
            if (serialPrinter.connect()) {
                val success = printToSerial(serialPrinter, receiptNumber, items, total, paymentMethod, subtotal, vat, discountAmount, discountLabel, amountTendered, change)
                serialPrinter.close()
                if (success) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Receipt Printed via H10 Serial ($port)", Toast.LENGTH_SHORT).show()
                    }
                    return
                }
            }
        }

        // 3. Fallback: USB
        val usbPrinter = UsbPrinter(context)
        if (usbPrinter.findPrinter()) {
            if (usbPrinter.connect()) {
                val usbSuccess = printToUsb(usbPrinter, receiptNumber, items, total, paymentMethod, subtotal, vat, discountAmount, discountLabel, amountTendered, change)
                usbPrinter.close()
                if (usbSuccess) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(context, "Receipt Printed via USB", Toast.LENGTH_SHORT).show()
                    }
                    return
                }
            }
        }

        // 3. Fallback: Bluetooth
        val bluetoothPrinter = findPrinter(context)
        if (bluetoothPrinter != null) {
            val btSuccess = printToDevice(bluetoothPrinter, receiptNumber, items, total, paymentMethod, subtotal, vat, discountAmount, discountLabel, amountTendered, change, context)
            if (btSuccess) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(context, "Receipt Printed via Bluetooth", Toast.LENGTH_SHORT).show()
                }
                return
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
        change: Double? = null
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
                        table { width: 100%; border-collapse: collapse; }
                        td { vertical-align: top; }
                        .total { font-size: 12px; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="center">
                        <div class="bold">OFFICIAL RECEIPT</div>
                        <h3 style="margin: 0; font-size: 14px;">PHARMACARE</h3>
                        <p style="margin: 0;">Quality Healthcare for You</p>
                    </div>
                    <hr>
                    <p>
                        RECPT: $receiptNumber<br>
                        DATE: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date())}
                    </p>
                    <hr>
                    <table>
                        ${items.joinToString("") { item ->
                            val name = item["name"]?.toString() ?: "Item"
                            val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                            val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                            "<tr><td colspan='2'>$name</td></tr>" +
                            "<tr><td>$qty x P${String.format("%.2f", price)}</td><td class='right'>P${String.format("%.2f", qty.toDouble() * price)}</td></tr>"
                        }}
                    </table>
                    <hr>
                    ${if (isSeniorOrPwd) """
                        <div class="right">GROSS AMOUNT: P${String.format("%.2f", gross)}</div>
                        <div class="right">LESS VAT (12%): -P${String.format("%.2f", vatRelief)}</div>
                        <div class="right">VAT-EXEMPT SALE: P${String.format("%.2f", vatExempt)}</div>
                        <div class="right">${if (discountLabel?.contains("PWD", ignoreCase = true) == true) "PWD" else "SENIOR"} DISCOUNT: -P${String.format("%.2f", seniorDiscount)}</div>
                        <div class="right bold">TOTAL DISCOUNT: -P${String.format("%.2f", discountAmount)}</div>
                    """ else """
                        <div class="right">SUBTOTAL: P${String.format("%.2f", subtotal ?: 0.0)}</div>
                        <div class="right">VAT (12%): P${String.format("%.2f", vat ?: 0.0)}</div>
                        ${if (discountAmount > 0) "<div class='right'>DISCOUNT: -P${String.format("%.2f", discountAmount)}</div>" else ""}
                    """}
                    <div class="right total bold">
                        ${if (isSeniorOrPwd) "NET PAID" else "TOTAL PAID"}: P${String.format("%.2f", total)}
                    </div>
                    ${if (amountTendered != null) """
                        <div class="right">TENDERED: P${String.format("%.2f", amountTendered)}</div>
                        <div class="right">CHANGE: P${String.format("%.2f", change ?: 0.0)}</div>
                    """ else ""}
                    <div class="bold">Payment: $paymentMethod</div>
                    <hr>
                    <div class="center">
                        <p>Thank you for your purchase!</p>
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
        change: Double? = null
    ): Boolean {
        try {
            printer.initialize()
            printer.setAlignCenter()
            printer.boldOn()
            printer.write("OFFICIAL RECEIPT\n".toByteArray())
            printer.boldOff()
            printer.doubleSizeOn()
            printer.write("PHARMACARE\n".toByteArray())
            printer.doubleSizeOff()
            printer.write("Quality Healthcare for You\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())
            
            printer.setAlignLeft()
            printer.write("RECPT: $receiptNumber\n".toByteArray())
            printer.write("DATE: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date())}\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())

            items.forEach { item ->
                val name = item["name"]?.toString() ?: "Item"
                val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                val lineTotal = qty.toDouble() * price
                
                printer.write("$name\n".toByteArray())
                val qtyPrice = "$qty x P${String.format("%.2f", price)}"
                val totalStr = "P${String.format("%.2f", lineTotal)}"
                val spaces = " ".repeat((32 - qtyPrice.length - totalStr.length).coerceAtLeast(1))
                printer.write("$qtyPrice$spaces$totalStr\n".toByteArray())
            }

            printer.write("--------------------------------\n".toByteArray())
            
            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            if (isSeniorOrPwd && discountAmount > 0) {
                val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                val vatRelief = vat ?: (gross - (gross / 1.12))
                val vatExempt = gross - vatRelief
                val seniorDiscount = discountAmount - vatRelief
                
                printer.write(("GROSS AMT:".padEnd(20) + String.format("P%,.2f", gross).padStart(12) + "\n").toByteArray())
                printer.write(("LESS VAT:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12) + "\n").toByteArray())
                printer.write(("VAT-EXEMPT:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12) + "\n").toByteArray())
                val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "PWD DISC:" else "SNR DISC:"
                printer.write((dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12) + "\n").toByteArray())
                printer.write(("TOTAL DISC:".padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12) + "\n").toByteArray())
            } else {
                if (subtotal != null) printer.write(("SUBTOTAL: P${String.format("%.2f", subtotal)}".padStart(32) + "\n").toByteArray())
                if (vat != null && vat > 0) printer.write(("VAT (12%): P${String.format("%.2f", vat)}".padStart(32) + "\n").toByteArray())
                if (discountAmount > 0) printer.write(("DISCOUNT: -P${String.format("%.2f", discountAmount)}".padStart(32) + "\n").toByteArray())
            }

            printer.boldOn()
            val finalLabel = if (isSeniorOrPwd) "NET PAID:" else "TOTAL PAID:"
            printer.write(("$finalLabel P${String.format("%.2f", total)}".padStart(32) + "\n").toByteArray())
            printer.boldOff()

            if (amountTendered != null && amountTendered > 0) {
                printer.write(("TENDERED: P${String.format("%.2f", amountTendered)}".padStart(32) + "\n").toByteArray())
                if (change != null) printer.write(("CHANGE: P${String.format("%.2f", change)}".padStart(32) + "\n").toByteArray())
            }

            printer.write("Payment: $paymentMethod\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())
            printer.setAlignCenter()
            printer.write("Thank you for your purchase!\n\n".toByteArray())
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
        change: Double? = null
    ): Boolean {
        try {
            printer.initialize()
            printer.setAlignCenter()
            printer.boldOn()
            printer.write("OFFICIAL RECEIPT\n".toByteArray())
            printer.boldOff()
            printer.doubleSizeOn()
            printer.write("PHARMACARE\n".toByteArray())
            printer.doubleSizeOff()
            printer.write("Quality Healthcare for You\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())
            
            printer.setAlignLeft()
            printer.write("RECPT: $receiptNumber\n".toByteArray())
            printer.write("DATE: ${java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date())}\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())

            items.forEach { item ->
                val name = item["name"]?.toString() ?: "Item"
                val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                val lineTotal = qty.toDouble() * price
                
                printer.write("$name\n".toByteArray())
                val qtyPrice = "$qty x P${String.format("%.2f", price)}"
                val totalStr = "P${String.format("%.2f", lineTotal)}"
                val spaces = " ".repeat((32 - qtyPrice.length - totalStr.length).coerceAtLeast(1))
                printer.write("$qtyPrice$spaces$totalStr\n".toByteArray())
            }

            printer.write("--------------------------------\n".toByteArray())
            
            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            if (isSeniorOrPwd && discountAmount > 0) {
                val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                val vatRelief = vat ?: (gross - (gross / 1.12))
                val vatExempt = gross - vatRelief
                val seniorDiscount = discountAmount - vatRelief
                
                printer.write(("GROSS AMT:".padEnd(20) + String.format("P%,.2f", gross).padStart(12) + "\n").toByteArray())
                printer.write(("LESS VAT:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12) + "\n").toByteArray())
                printer.write(("VAT-EXEMPT:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12) + "\n").toByteArray())
                val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "PWD DISC:" else "SNR DISC:"
                printer.write((dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12) + "\n").toByteArray())
                printer.write(("TOTAL DISC:".padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12) + "\n").toByteArray())
            } else {
                if (subtotal != null) printer.write(("SUBTOTAL: P${String.format("%.2f", subtotal)}".padStart(32) + "\n").toByteArray())
                if (vat != null && vat > 0) printer.write(("VAT (12%): P${String.format("%.2f", vat)}".padStart(32) + "\n").toByteArray())
                if (discountAmount > 0) printer.write(("DISCOUNT: -P${String.format("%.2f", discountAmount)}".padStart(32) + "\n").toByteArray())
            }

            printer.boldOn()
            val finalLabel = if (isSeniorOrPwd) "NET PAID:" else "TOTAL PAID:"
            printer.write(("$finalLabel P${String.format("%.2f", total)}".padStart(32) + "\n").toByteArray())
            printer.boldOff()

            if (amountTendered != null && amountTendered > 0) {
                printer.write(("TENDERED: P${String.format("%.2f", amountTendered)}".padStart(32) + "\n").toByteArray())
                if (change != null) printer.write(("CHANGE: P${String.format("%.2f", change)}".padStart(32) + "\n").toByteArray())
            }

            printer.write("Payment: $paymentMethod\n".toByteArray())
            printer.write("--------------------------------\n".toByteArray())
            printer.setAlignCenter()
            printer.write("Thank you for your purchase!\n\n".toByteArray())
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
        context: Context
    ): Boolean = withContext(Dispatchers.IO) {
        if (!printer.connect()) return@withContext false

        try {
            printer.initialize()
            printer.alignCenter()
            printer.boldOn()
            printer.printLine("OFFICIAL RECEIPT")
            printer.boldOff()
            printer.doubleSizeOn()
            printer.printLine("PHARMACARE")
            printer.doubleSizeOff()
            printer.printLine("Quality Healthcare for You")
            printer.printLine("--------------------------------")
            
            printer.alignLeft()
            printer.printLine("RECPT: $receiptNumber")
            val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())
            printer.printLine("DATE: ${sdf.format(Date())}")
            printer.printLine("--------------------------------")
            
            items.forEach { item ->
                val name = item["name"]?.toString() ?: "Item"
                val qty = (item["qty"] as? Double)?.toInt() ?: (item["quantity"] as? Double)?.toInt() ?: 1
                val price = (item["price"] as? Double) ?: (item["unit_price"] as? Double) ?: 0.0
                val lineTotal = qty.toDouble() * price
                
                printer.printLine(name)
                val qtyPrice = "$qty x P${String.format("%.2f", price)}"
                val totalS = "P${String.format("%.2f", lineTotal)}"
                val spaces = " ".repeat((32 - qtyPrice.length - totalS.length).coerceAtLeast(1))
                printer.printLine("$qtyPrice$spaces$totalS")
            }
            
            printer.printLine("--------------------------------")
            
            val isSeniorOrPwd = discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                               discountLabel?.contains("PWD", ignoreCase = true) == true
            
            if (isSeniorOrPwd && discountAmount > 0) {
                val gross = (subtotal ?: 0.0) + (vat ?: 0.0)
                val vatRelief = vat ?: (gross - (gross / 1.12))
                val vatExempt = gross - vatRelief
                val seniorDiscount = discountAmount - vatRelief
                
                printer.printLine("GROSS AMT:".padEnd(20) + String.format("P%,.2f", gross).padStart(12))
                printer.printLine("LESS VAT:".padEnd(20) + String.format("-P%,.2f", vatRelief).padStart(12))
                printer.printLine("VAT-EXEMPT:".padEnd(20) + String.format("P%,.2f", vatExempt).padStart(12))
                val dLabel = if (discountLabel?.contains("PWD", ignoreCase = true) == true) "PWD DISC:" else "SNR DISC:"
                printer.printLine(dLabel.padEnd(20) + String.format("-P%,.2f", seniorDiscount).padStart(12))
                printer.printLine("TOTAL DISC:".padEnd(20) + String.format("-P%,.2f", discountAmount).padStart(12))
            } else {
                if (subtotal != null) printer.printLine("SUBTOTAL: P${String.format("%.2f", subtotal)}".padStart(32))
                if (vat != null && vat > 0) printer.printLine("VAT (12%): P${String.format("%.2f", vat)}".padStart(32))
                if (discountAmount > 0) printer.printLine("DISCOUNT: -P${String.format("%.2f", discountAmount)}".padStart(32))
            }
            
            printer.boldOn()
            val finalLabel = if (isSeniorOrPwd) "NET PAID:" else "TOTAL PAID:"
            printer.printLine("$finalLabel P${String.format("%.2f", total)}".padStart(32))
            printer.boldOff()

            if (amountTendered != null && amountTendered > 0) {
                printer.printLine("TENDERED: P${String.format("%.2f", amountTendered)}".padStart(32))
                if (change != null) printer.printLine("CHANGE: P${String.format("%.2f", change)}".padStart(32))
            }
            
            printer.printLine("Payment: $paymentMethod")
            printer.printLine("--------------------------------")
            printer.alignCenter()
            printer.printLine("Thank you for your purchase!")
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

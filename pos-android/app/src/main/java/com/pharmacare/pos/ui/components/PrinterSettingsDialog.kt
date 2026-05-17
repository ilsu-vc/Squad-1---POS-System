package com.pharmacare.pos.ui.components

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Refresh
import android.widget.Toast
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Lan
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.util.BluetoothPrinter
import com.pharmacare.pos.util.PrintManager
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.*

@SuppressLint("MissingPermission")
@Composable
fun PrinterSettingsDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    var pairedDevices by remember { mutableStateOf(BluetoothPrinter.getPairedDevices()) }
    var usbDevices by remember { mutableStateOf(getUsbDevices(context)) }
    var serialDevices by remember { mutableStateOf(getSerialDevices()) }
    var printerServices by remember { mutableStateOf(getPrinterServices(context)) }
    var isPort9100Open by remember { mutableStateOf(false) }
    var selectedMac by remember { mutableStateOf(PrintManager.getSavedPrinter(context)) }
    var h10Ip by remember { mutableStateOf(PrintManager.getH10Ip(context) ?: "") }
    var isServerRunning by remember { mutableStateOf(com.pharmacare.pos.util.PrintServer.isRunning()) }
    var diagnosticReport by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Print, contentDescription = null, tint = Primary)
                    Spacer(Modifier.width(10.dp))
                    Text("Printer Settings", fontWeight = FontWeight.Bold)
                }
                IconButton(onClick = { 
                    pairedDevices = BluetoothPrinter.getPairedDevices() 
                    usbDevices = getUsbDevices(context)
                    serialDevices = getSerialDevices()
                    printerServices = getPrinterServices(context)
                    scope.launch {
                        isPort9100Open = checkPort9100()
                    }
                }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = Primary)
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth().heightIn(max = 600.dp).verticalScroll(rememberScrollState())) {
                
                // --- PRINT SERVER SECTION (PRIORITIZED FOR H10) ---
                Surface(
                    color = Primary.copy(alpha = 0.05f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Print Server Mode", fontWeight = FontWeight.Bold, color = Primary, fontSize = 14.sp)
                        Text("Turn this ON if this device is the H10 handheld.", color = TextMuted, fontSize = 11.sp)
                        
                        Spacer(Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Enable Print Server", fontWeight = FontWeight.Medium)
                            Switch(
                                checked = isServerRunning,
                                onCheckedChange = { running ->
                                    if (running) {
                                        com.pharmacare.pos.util.PrintService.start(context)
                                    } else {
                                        com.pharmacare.pos.util.PrintService.stop(context)
                                    }
                                    isServerRunning = running
                                }
                            )
                        }

                        if (isServerRunning) {
                            val ip = getLocalIpAddress()
                            Text("Server listening on $ip:9100", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(16.dp))

                // --- BACKEND SERVER SECTION ---
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Backend API Settings", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary, fontSize = 14.sp)
                        Text("Update the IP if you switched Hotspot/Wi-Fi.", color = TextMuted, fontSize = 11.sp)
                        
                        Spacer(Modifier.height(10.dp))
                        
                        var backendIp by remember { mutableStateOf(PrintManager.getApiIp(context) ?: "") }
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                value = backendIp,
                                onValueChange = { 
                                    backendIp = it
                                },
                                label = { Text("Backend IP (e.g. 192.168.43.1)") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp),
                                leadingIcon = { Icon(Icons.Default.Cloud, null) }
                            )
                        }
                        
                        Spacer(Modifier.height(8.dp))
                        
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(
                                onClick = {
                                    PrintManager.saveApiIp(context, backendIp)
                                    com.pharmacare.pos.data.api.ApiClient.updateBaseUrl(backendIp)
                                    Toast.makeText(context, "Backend IP Saved & Applied!", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Save & Apply")
                            }
                            
                            OutlinedButton(
                                onClick = {
                                    scope.launch {
                                        try {
                                            val response = com.pharmacare.pos.data.api.ApiClient.productApi.getProducts()
                                            if (response.isSuccessful) {
                                                Toast.makeText(context, "Connection Successful! ✅", Toast.LENGTH_SHORT).show()
                                            } else {
                                                Toast.makeText(context, "Connected but Server error: ${response.code()}", Toast.LENGTH_LONG).show()
                                            }
                                        } catch (e: Exception) {
                                            Toast.makeText(context, "Failed to connect: ${e.message}", Toast.LENGTH_LONG).show()
                                        }
                                    }
                                },
                                modifier = Modifier.weight(0.6f),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Text("Test")
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(16.dp))

                // --- H10 NETWORK PRINTER SECTION ---
                Text("H10 Network Printer (IP Connection)", fontWeight = FontWeight.Bold, color = Primary, fontSize = 14.sp)
                Text("Use this on the TABLET to connect to the H10.", color = TextMuted, fontSize = 11.sp)
                
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = h10Ip,
                        onValueChange = { 
                            h10Ip = it
                            PrintManager.saveH10Ip(context, it)
                        },
                        label = { Text("H10 IP Address") },
                        placeholder = { Text("e.g. 192.168.1.50") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp),
                        leadingIcon = { Icon(Icons.Default.Lan, null) }
                    )
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                val netPrinter = com.pharmacare.pos.util.NetworkPrinter(h10Ip)
                                try {
                                    if (netPrinter.connect(timeout = 3000)) {
                                        Toast.makeText(context, "H10 Found! Connection OK ✅", Toast.LENGTH_SHORT).show()
                                        netPrinter.close()
                                    } else {
                                        Toast.makeText(context, "Cannot reach H10. Is the server running? ❌", Toast.LENGTH_LONG).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Primary.copy(alpha = 0.8f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.height(56.dp)
                    ) {
                        Text("Test")
                    }
                }

                Spacer(Modifier.height(24.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(16.dp))

                Text("Bluetooth Printers", color = TextMuted, fontSize = 13.sp)
                Spacer(Modifier.height(8.dp))

                if (pairedDevices.isEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                        Text("No paired Bluetooth devices found.", color = TextMuted)
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        pairedDevices.forEach { device ->
                            val isSelected = selectedMac == device.address
                            Surface(
                                color = if (isSelected) Primary.copy(alpha = 0.1f) else White,
                                shape = RoundedCornerShape(10.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) Primary else Border),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedMac = device.address
                                        PrintManager.savePrinter(context, device.address)
                                    }
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Bluetooth,
                                        contentDescription = null,
                                        tint = if (isSelected) Primary else TextMuted,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            text = device.name ?: "Unknown Device",
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) Primary else TextPrimary
                                        )
                                        Text(device.address, fontSize = 11.sp, color = TextMuted)
                                    }
                                    if (isSelected) {
                                        Icon(Icons.Default.CheckCircle, null, tint = Success, modifier = Modifier.size(20.dp))
                                    }
                                }
                            }
                        }
                    }
                }
                
                Spacer(Modifier.height(16.dp))
                Text("USB Devices Found: ${usbDevices.size}", fontWeight = FontWeight.Bold, color = Primary, fontSize = 12.sp)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    usbDevices.forEach { dev ->
                        Surface(
                            color = White,
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(Modifier.padding(14.dp)) {
                                Text("USB: ${dev.deviceName}", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                Text("ID: ${dev.vendorId}:${dev.productId} | Class: ${dev.deviceClass}", fontSize = 10.sp, color = TextMuted)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))
                Text("Serial Devices Found: ${serialDevices.size}", fontWeight = FontWeight.Bold, color = Primary, fontSize = 12.sp)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    serialDevices.forEach { port ->
                        Text("Port: $port", fontSize = 11.sp, color = TextSecondary, modifier = Modifier.padding(start = 14.dp))
                    }
                }
                val portStatus = if (isPort9100Open) "OPEN ✅" else "CLOSED ❌"
                Text("Internal Print Server (Port 9100): $portStatus", 
                    fontWeight = FontWeight.Bold, color = if (isPort9100Open) Success else Error, fontSize = 12.sp)

                Spacer(Modifier.height(16.dp))
                Text("Installed Printer Services: ${printerServices.size}", fontWeight = FontWeight.Bold, color = Primary, fontSize = 12.sp)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    printerServices.forEach { service ->
                        Text("• $service", fontSize = 11.sp, color = TextSecondary, modifier = Modifier.padding(start = 14.dp))
                    }
                }

                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        diagnosticReport = PrintManager.getH10DiagnosticReport(context)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Run H10 Diagnostic")
                }

                if (diagnosticReport != null) {
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        color = Color(0xFFF3F4F6),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            diagnosticReport!!,
                            modifier = Modifier.padding(12.dp),
                            fontSize = 11.sp,
                            fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
                            color = Color.Black
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        scope.launch {
                            val ports = listOf("/dev/ttyS0", "/dev/ttyS1", "/dev/ttyS2", "/dev/ttyS3", "/dev/ttyS4", "/dev/ttyMT0", "/dev/ttyMT1", "/dev/ttyMT2")
                            for (port in ports) {
                                val printer = com.pharmacare.pos.util.SerialPrinter(port)
                                if (printer.connect()) {
                                    printer.initialize()
                                    printer.write("\n\nFORCE TEST ON $port\n\n\n\n".toByteArray())
                                    printer.close()
                                }
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = androidx.compose.ui.graphics.Color.Gray)
                ) {
                    Text("Force Serial Test (Brute Force)")
                }

                Spacer(Modifier.height(16.dp))
                Text("Tip: If your printer is not listed, pair it first in your Android System Settings.", fontSize = 11.sp, color = TextMuted)
            }
        },
        confirmButton = {
            Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Primary)) {
                Text("Done")
            }
        },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

private fun getUsbDevices(context: Context): List<android.hardware.usb.UsbDevice> {
    val usbManager = context.getSystemService(Context.USB_SERVICE) as android.hardware.usb.UsbManager
    return usbManager.deviceList.values.toList()
}

private fun getSerialDevices(): List<String> {
    return try {
        val dev = java.io.File("/dev")
        val files = dev.listFiles() ?: return emptyList()
        // Broaden the search to any potential serial port name
        files.filter { 
            val name = it.name
            name.startsWith("ttyS") || 
            name.startsWith("ttyMT") || 
            name.startsWith("ttyUSB") || 
            name.startsWith("ttyACM") ||
            name.startsWith("ttyGS") ||
            name.startsWith("tty") && name.length > 4 // catch ttyMTK etc
        }
        .map { it.absolutePath }
        .take(50) // Cap it so the UI doesn't explode
    } catch (e: Exception) {
        emptyList()
    }
}

private fun getPrinterServices(context: Context): List<String> {
    val pm = context.packageManager
    val packages = pm.getInstalledPackages(0)
    return packages.filter { 
        val name = it.packageName.lowercase()
        name.contains("print") || name.contains("pos") || name.contains("imin") || name.contains("mobi")
    }.map { it.packageName }
}

private suspend fun checkPort9100(): Boolean = withContext(Dispatchers.IO) {
    try {
        val socket = java.net.Socket()
        socket.connect(java.net.InetSocketAddress("127.0.0.1", 9100), 1000)
        socket.close()
        true
    } catch (e: Exception) {
        false
    }
}

private fun getLocalIpAddress(): String {
    var backupIp = "0.0.0.0"
    try {
        val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
        while (interfaces.hasMoreElements()) {
            val networkInterface = interfaces.nextElement()
            val interfaceName = networkInterface.name.lowercase()
            
            // Prioritize Wi-Fi (wlan) and Hotspot (ap/softap) interfaces
            val isWifiOrAp = interfaceName.contains("wlan") || interfaceName.contains("ap")
            
            val addresses = networkInterface.inetAddresses
            while (addresses.hasMoreElements()) {
                val addr = addresses.nextElement()
                if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                    val ip = addr.hostAddress ?: ""
                    if (isWifiOrAp) return ip // Found our priority IP!
                    backupIp = ip // Save this in case we don't find wlan/ap
                }
            }
        }
    } catch (ex: Exception) {}
    return if (backupIp != "0.0.0.0") backupIp else "Check Wi-Fi Connection"
}

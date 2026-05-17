package com.pharmacare.pos.util

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.*
import android.os.Build
import android.util.Log

class UsbPrinter(private val context: Context) {
    private val usbManager: UsbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var device: UsbDevice? = null
    private var connection: UsbDeviceConnection? = null
    private var endpoint: UsbEndpoint? = null

    companion object {
        private const val TAG = "UsbPrinter"
        private const val ACTION_USB_PERMISSION = "com.pharmacare.pos.USB_PERMISSION"
    }

    fun findPrinter(): Boolean {
        val deviceList = usbManager.deviceList
        for (device in deviceList.values) {
            // Check if device is a printer (Class 7)
            if (isPrinter(device)) {
                this.device = device
                Log.d(TAG, "Found USB Printer: ${device.deviceName}")
                return true
            }
        }
        return false
    }

    private fun isPrinter(device: UsbDevice): Boolean {
        // Standard USB Printer Class is 7
        if (device.deviceClass == 7) return true
        
        // SPECIFIC FIX: MobiIot H10 internal printer IDs
        if (device.vendorId == 0x0FE6 && device.productId == 0x811E) return true
        if (device.vendorId == 0x0483 && device.productId == 0x5740) return true

        // Some common POS Vendor IDs that might use Vendor Specific Class (255)
        val commonVids = listOf(0x0483, 0x0FE6, 0x0416, 0x1504, 0x04B8, 0x0E50)
        if (commonVids.contains(device.vendorId)) return true

        // Check interfaces
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            if (iface.interfaceClass == 7) return true
        }
        return false
    }

    fun connect(): Boolean {
        val dev = device ?: return false
        
        if (!usbManager.hasPermission(dev)) {
            requestPermission(dev)
            return false
        }

        try {
            val usbInterface = findPrinterInterface(dev) ?: return false
            val conn = usbManager.openDevice(dev) ?: return false
            
            if (conn.claimInterface(usbInterface, true)) {
                connection = conn
                endpoint = findEndpoint(usbInterface)
                Log.d(TAG, "USB Printer Connected")
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "USB Connection error: ${e.message}")
        }
        return false
    }

    private fun findPrinterInterface(device: UsbDevice): UsbInterface? {
        // Try to find the actual printer interface
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            if (iface.interfaceClass == 7) return iface
        }
        
        // MobiIot/H10 Fallback: Force interface 0
        if (device.vendorId == 0x0FE6 || device.vendorId == 0x0483) {
            return device.getInterface(0)
        }

        return device.getInterface(0)
    }

    private fun findEndpoint(usbInterface: UsbInterface): UsbEndpoint? {
        for (i in 0 until usbInterface.endpointCount) {
            val ep = usbInterface.getEndpoint(i)
            if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK && ep.direction == UsbConstants.USB_DIR_OUT) {
                return ep
            }
        }
        return null
    }

    private fun requestPermission(device: UsbDevice) {
        val permissionIntent = PendingIntent.getBroadcast(
            context, 0, Intent(ACTION_USB_PERMISSION), 
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        )
        usbManager.requestPermission(device, permissionIntent)
    }

    fun write(data: ByteArray): Boolean {
        val conn = connection ?: return false
        val ep = endpoint ?: return false
        val result = conn.bulkTransfer(ep, data, data.size, 5000)
        return result >= 0
    }

    fun close() {
        connection?.close()
        connection = null
        endpoint = null
    }

    // Helper ESC/POS commands
    fun initialize() = write(byteArrayOf(0x1B, 0x40))
    fun setAlignCenter() = write(byteArrayOf(0x1B, 0x61, 0x01))
    fun setAlignLeft() = write(byteArrayOf(0x1B, 0x61, 0x00))
    fun boldOn() = write(byteArrayOf(0x1B, 0x45, 0x01))
    fun boldOff() = write(byteArrayOf(0x1B, 0x45, 0x00))
    fun doubleSizeOn() = write(byteArrayOf(0x1B, 0x21, 0x30))
    fun doubleSizeOff() = write(byteArrayOf(0x1B, 0x21, 0x00))
    fun feed(lines: Int) = write(byteArrayOf(0x1B, 0x64, lines.toByte()))
}

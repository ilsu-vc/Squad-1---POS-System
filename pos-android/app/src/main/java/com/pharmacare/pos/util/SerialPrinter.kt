package com.pharmacare.pos.util

import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class SerialPrinter(private val portPath: String) {
    private var outputStream: OutputStream? = null

    companion object {
        private const val TAG = "SerialPrinter"
        val COMMON_PORTS = listOf("/dev/ttyS1", "/dev/ttyS0", "/dev/ttyMT1", "/dev/ttyMT0", "/dev/ttyS3")
    }

    fun connect(): Boolean {
        return try {
            val file = File(portPath)
            if (!file.exists()) {
                Log.e(TAG, "Port $portPath does not exist")
                return false
            }

            // Set baud rate using system command (H10 usually uses 115200 or 9600)
            try {
                Runtime.getRuntime().exec("stty -F $portPath 115200")
            } catch (e: Exception) {
                Log.w(TAG, "Could not set baud rate via stty: ${e.message}")
            }

            // Try to open the port for writing
            outputStream = FileOutputStream(file)
            Log.d(TAG, "Connected to Serial Port: $portPath")
            
            // Send Reset/Initialize command immediately
            initialize()
            
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect to $portPath: ${e.message}")
            false
        }
    }

    fun write(data: ByteArray): Boolean {
        return try {
            outputStream?.write(data)
            outputStream?.flush()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun close() {
        try {
            outputStream?.close()
        } catch (e: Exception) {}
        outputStream = null
    }

    // ESC/POS commands
    fun initialize() = write(byteArrayOf(0x1B, 0x40))
    fun setAlignCenter() = write(byteArrayOf(0x1B, 0x61, 0x01))
    fun setAlignLeft() = write(byteArrayOf(0x1B, 0x61, 0x00))
    fun boldOn() = write(byteArrayOf(0x1B, 0x45, 0x01))
    fun boldOff() = write(byteArrayOf(0x1B, 0x45, 0x00))
    fun doubleSizeOn() = write(byteArrayOf(0x1B, 0x21, 0x30))
    fun doubleSizeOff() = write(byteArrayOf(0x1B, 0x21, 0x00))
    fun feed(lines: Int) = write(byteArrayOf(0x1B, 0x64, lines.toByte()))
}

package com.pharmacare.pos.util

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

class NetworkPrinter(private val ipAddress: String, private val port: Int = 9100) {
    private var socket: Socket? = null
    private var outputStream: OutputStream? = null

    suspend fun connect(timeout: Int = 3000): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            close() // Ensure any old socket is closed
            socket = Socket()
            socket?.connect(InetSocketAddress(ipAddress.trim(), port), timeout)
            outputStream = socket?.getOutputStream()
            true
        } catch (e: Exception) {
            Log.e("NetworkPrinter", "Connect to $ipAddress failed: ${e.message}")
            false
        }
    }

    suspend fun write(data: ByteArray): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            outputStream?.write(data)
            outputStream?.flush()
            true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun close() = withContext(Dispatchers.IO) {
        try {
            outputStream?.close()
            socket?.close()
        } catch (e: Exception) {}
        outputStream = null
        socket = null
    }

    // ESC/POS Commands
    suspend fun initialize() = write(byteArrayOf(0x1B, 0x40))
    suspend fun setAlignCenter() = write(byteArrayOf(0x1B, 0x61, 0x01))
    suspend fun setAlignLeft() = write(byteArrayOf(0x1B, 0x61, 0x00))
    suspend fun setAlignRight() = write(byteArrayOf(0x1B, 0x61, 0x02))
    suspend fun boldOn() = write(byteArrayOf(0x1B, 0x45, 0x01))
    suspend fun boldOff() = write(byteArrayOf(0x1B, 0x45, 0x00))
    suspend fun doubleSizeOn() = write(byteArrayOf(0x1B, 0x21, 0x30))
    suspend fun doubleSizeOff() = write(byteArrayOf(0x1B, 0x21, 0x00))
    suspend fun feed(lines: Int) = write(byteArrayOf(0x1B, 0x64, lines.toByte()))
    suspend fun printLine(text: String) = write((text + "\n").toByteArray())
}

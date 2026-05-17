package com.pharmacare.pos.util

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.util.Log
import java.io.IOException
import java.io.OutputStream
import java.util.*

class BluetoothPrinter(private val macAddress: String) {

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    companion object {
        private val PRINTER_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb")
        private const val TAG = "BluetoothPrinter"

        @SuppressLint("MissingPermission")
        fun getPairedDevices(): List<BluetoothDevice> {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            return adapter?.bondedDevices?.toList() ?: emptyList()
        }
    }

    @SuppressLint("MissingPermission")
    fun connect(): Boolean {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: return false
            if (!adapter.isEnabled) return false
            
            val device = adapter.getRemoteDevice(macAddress)
            
            // Cancel discovery as it slows down connection
            adapter.cancelDiscovery()

            Log.d(TAG, "Attempting to connect to ${device.name} ($macAddress)")

            // Try Secure connection first
            return try {
                socket = device.createRfcommSocketToServiceRecord(PRINTER_UUID)
                socket?.connect()
                outputStream = socket?.outputStream
                Log.d(TAG, "Connected via secure socket")
                true
            } catch (e: Exception) {
                Log.w(TAG, "Secure connection failed, trying insecure: ${e.message}")
                // Fallback 1: Insecure connection
                try {
                    socket = device.createInsecureRfcommSocketToServiceRecord(PRINTER_UUID)
                    socket?.connect()
                    outputStream = socket?.outputStream
                    Log.d(TAG, "Connected via insecure socket")
                    true
                } catch (e2: Exception) {
                    Log.w(TAG, "Insecure connection failed, trying Deep Connection (Reflection): ${e2.message}")
                    // Fallback 2: Deep Connection (Reflection) - Often works for stubborn handheld printers
                    try {
                        val method = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                        socket = method.invoke(device, 1) as BluetoothSocket
                        socket?.connect()
                        outputStream = socket?.outputStream
                        Log.d(TAG, "Connected via Deep Connection (Channel 1)")
                        true
                    } catch (e3: Exception) {
                        Log.e(TAG, "All connection attempts failed: ${e3.message}")
                        close()
                        false
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Critical connection error: ${e.message}")
            close()
            return false
        }
    }

    fun write(bytes: ByteArray) {
        try {
            outputStream?.write(bytes)
            outputStream?.flush()
        } catch (e: IOException) {
            Log.e(TAG, "Write failed: ${e.message}")
        }
    }

    fun printLine(text: String) {
        write((text + "\n").toByteArray(Charsets.US_ASCII))
    }

    fun feed(lines: Int = 1) {
        repeat(lines) {
            write(byteArrayOf(0x0A))
        }
    }

    // ESC/POS Commands
    fun initialize() = write(byteArrayOf(0x1B, 0x40))
    fun alignLeft() = write(byteArrayOf(0x1B, 0x61, 0x00))
    fun alignCenter() = write(byteArrayOf(0x1B, 0x61, 0x01))
    fun alignRight() = write(byteArrayOf(0x1B, 0x61, 0x02))
    fun boldOn() = write(byteArrayOf(0x1B, 0x45, 0x01))
    fun boldOff() = write(byteArrayOf(0x1B, 0x45, 0x00))
    fun doubleSizeOn() = write(byteArrayOf(0x1D, 0x21, 0x11))
    fun doubleSizeOff() = write(byteArrayOf(0x1D, 0x21, 0x00))

    fun getMac(): String = macAddress

    fun close() {
        try {
            outputStream?.close()
            socket?.close()
        } catch (e: IOException) {
            Log.e(TAG, "Close failed: ${e.message}")
        }
        outputStream = null
        socket = null
    }
}

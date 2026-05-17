package com.pharmacare.pos.util

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import java.io.ByteArrayOutputStream
import java.net.ServerSocket
import java.net.Socket

object PrintServer {
    private const val TAG = "PrintServer"
    private const val PORT = 9100
    
    private var serverJob: Job? = null
    private var isRunning = false

    fun start(context: Context) {
        if (isRunning) return
        
        isRunning = true
        serverJob = CoroutineScope(Dispatchers.IO).launch {
            var serverSocket: ServerSocket? = null
            try {
                serverSocket = ServerSocket(PORT)
                Log.d(TAG, "Print Server started on port $PORT")
                
                while (isActive) {
                    val clientSocket = serverSocket.accept()
                    handleClient(context, clientSocket)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Server error: ${e.message}")
            } finally {
                serverSocket?.close()
                isRunning = false
            }
        }
    }

    private fun handleClient(context: Context, socket: Socket) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val input = socket.getInputStream()
                val buffer = ByteArray(1024)
                val output = ByteArrayOutputStream()
                var bytesRead: Int
                
                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                }
                
                val rawData = output.toByteArray()
                Log.d(TAG, "Received ${rawData.size} bytes from ${socket.inetAddress}")
                
                withContext(Dispatchers.Main) {
                    android.widget.Toast.makeText(context, "H10: Received Print Job (${rawData.size} bytes)", android.widget.Toast.LENGTH_SHORT).show()
                }

                // Process printing
                PrintManager.printRawBytes(context, rawData)
                
            } catch (e: Exception) {
                Log.e(TAG, "Client error: ${e.message}")
            } finally {
                socket.close()
            }
        }
    }

    fun stop() {
        serverJob?.cancel()
        isRunning = false
    }
    
    fun isRunning() = isRunning
}

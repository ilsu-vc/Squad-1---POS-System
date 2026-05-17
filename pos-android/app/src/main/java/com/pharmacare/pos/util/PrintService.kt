package com.pharmacare.pos.util

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import android.util.Log
import kotlinx.coroutines.*
import com.pharmacare.pos.data.repository.PrintQueueRepository
import kotlinx.serialization.json.*

class PrintService : Service() {
    private var serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private var isMonitoring = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "STOP") {
            PrintServer.stop()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("POS Print Server Active")
            .setContentText("Listening for print jobs on port 9100")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .build()

        startForeground(1, notification)
        
        // Start the Local Server (Optional)
        PrintServer.start(this)

        // Start Cloud Monitoring
        startCloudMonitoring()

        return START_STICKY
    }

    private fun startCloudMonitoring() {
        if (isMonitoring) return
        isMonitoring = true
        
        serviceScope.launch {
            while (isMonitoring) {
                try {
                    val pendingJobs = PrintQueueRepository.getPendingJobs()
                    for (job in pendingJobs) {
                        val jobId = job["id"]?.jsonPrimitive?.content
                        val receiptNumber = job["receipt_number"]?.jsonPrimitive?.content ?: "Unknown"
                        
                        if (jobId != null) {
                            Log.d("PrintService", "Found cloud job: $receiptNumber")
                            
                            // Convert items back to List<Map<String, Any>>
                            val itemsJson = job["items"] as? JsonArray ?: JsonArray(emptyList())
                            val items = itemsJson.map { element ->
                                val obj = element as JsonObject
                                obj.mapValues { (_, value) ->
                                    when (value) {
                                        is JsonPrimitive -> {
                                            if (value.isString) value.content
                                            else value.doubleOrNull ?: value.intOrNull ?: value.content
                                        }
                                        else -> value.toString()
                                    }
                                }
                            }

                            val total = job["total"]?.jsonPrimitive?.doubleOrNull ?: 0.0
                            val paymentMethod = job["payment_method"]?.jsonPrimitive?.content ?: "Cash"

                            // Print the job
                            PrintManager.printReceipt(
                                context = applicationContext,
                                receiptNumber = receiptNumber,
                                items = items,
                                total = total,
                                paymentMethod = paymentMethod,
                                localOnly = true
                            )

                            // Mark as printed
                            PrintQueueRepository.markAsPrinted(jobId)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("PrintService", "Error in cloud monitoring", e)
                }
                delay(3000) // Check every 3 seconds
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isMonitoring = false
        serviceJob.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Print Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    companion object {
        const val CHANNEL_ID = "PrintServiceChannel"
        
        fun start(context: Context) {
            val intent = Intent(context, PrintService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, PrintService::class.java)
            intent.action = "STOP"
            context.startService(intent)
        }
    }
}

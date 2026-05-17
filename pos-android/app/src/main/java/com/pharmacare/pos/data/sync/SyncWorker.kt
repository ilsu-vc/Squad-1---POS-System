package com.pharmacare.pos.data.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.api.CompleteTransactionRequest
import com.pharmacare.pos.data.local.AppDatabase
import io.github.jan.supabase.gotrue.auth

class SyncWorker(appContext: Context, workerParams: WorkerParameters) :
    CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(applicationContext)
        val transactionDao = database.transactionDao()
        val queuedTransactions = transactionDao.getAllQueued()

        if (queuedTransactions.isEmpty()) return Result.success()

        val user = com.pharmacare.pos.data.auth.SupabaseManager.client.auth.currentUserOrNull()
        var allSuccess = true

        for (tx in queuedTransactions) {
            try {
                val itemType = object : TypeToken<List<Map<String, Any>>>() {}.type
                val items: List<Map<String, Any>> = Gson().fromJson(tx.itemsJson, itemType)

                // Ensure items have product_id (legacy offline logs might be missing it)
                val response = ApiClient.transactionApi.completeTransaction(
                    CompleteTransactionRequest(
                        transactionId = tx.transactionId,
                        vat = tx.vat,
                        subtotal = tx.subtotal,
                        totalAmount = tx.totalAmount,
                        amountPaid = tx.totalAmount,
                        paymentMethod = "Cash (Offline Sync)",
                        itemsCount = items.sumOf { (it["quantity"] as? Double ?: 1.0).toInt() },
                        items = items
                    )
                )

                if (response.isSuccessful) {
                    transactionDao.delete(tx)
                    
                    // Log the synced sale
                    try {
                        com.pharmacare.pos.util.ActivityLogger.log(
                            actionType = "SALE",
                            actionDetails = "Synced offline sale worth ₱${String.format("%.2f", tx.totalAmount)}",
                            entityType = "transaction",
                            entityId = tx.transactionId
                        )
                    } catch (_: Exception) {}
                } else {
                    allSuccess = false
                }
            } catch (e: Exception) {
                allSuccess = false
            }
        }

        return if (allSuccess) Result.success() else Result.retry()
    }
}

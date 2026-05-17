package com.pharmacare.pos.data.repository

import com.pharmacare.pos.data.auth.SupabaseManager
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import android.util.Log

object PrintQueueRepository {
    private const val TAG = "PrintQueueRepo"

    suspend fun enqueue(receiptNumber: String, items: List<Map<String, Any>>, total: Double, paymentMethod: String): String? {
        return try {
            val jobJson = buildJsonObject {
                put("receipt_number", receiptNumber)
                put("total", total)
                put("payment_method", paymentMethod)
                put("status", "pending")
                put("items", buildJsonArray {
                    items.forEach { item ->
                        addJsonObject {
                            put("name", item["name"]?.toString() ?: "Item")
                            put("qty", (item["qty"] as? Number)?.toDouble() ?: 1.0)
                            put("price", (item["price"] as? Number)?.toDouble() ?: 0.0)
                        }
                    }
                })
            }

            SupabaseManager.client.postgrest["print_queue"].insert(jobJson)
            Log.d(TAG, "Enqueued print job: $receiptNumber")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Error enqueuing print job", e)
            e.message ?: "Unknown Error"
        }
    }

    suspend fun getPendingJobs(): List<Map<String, JsonElement>> {
        return try {
            val response = SupabaseManager.client.postgrest["print_queue"]
                .select {
                    filter {
                        eq("status", "pending")
                    }
                }
            
            // Decode as a list of JsonObjects (which are maps)
            response.decodeList<JsonObject>().map { it.toMap() }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching pending jobs", e)
            emptyList()
        }
    }

    suspend fun markAsPrinted(jobId: String): Boolean {
        return try {
            SupabaseManager.client.postgrest["print_queue"]
                .update({
                    set("status", "printed")
                }) {
                    filter {
                        eq("id", jobId)
                    }
                }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error marking job as printed", e)
            false
        }
    }
}

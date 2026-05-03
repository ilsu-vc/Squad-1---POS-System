package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class StartTransactionRequest(val userId: String)

data class CompleteTransactionRequest(
    val transactionId: String,
    val vat: Double,
    val subtotal: Double,
    val totalAmount: Double,
    val amountPaid: Double,
    val paymentMethod: String,
    val itemsCount: Int,
    val items: List<Map<String, Any>>,
    val discountType: String? = null,
    val discountAmount: Double? = null
)

interface TransactionApi {
    @POST("/api/transactions/transactions/start")
    suspend fun startTransaction(@Body body: StartTransactionRequest): Response<Map<String, Any>>

    @POST("/api/transactions/transactions/complete")
    suspend fun completeTransaction(@Body body: CompleteTransactionRequest): Response<Map<String, Any>>

    @POST("/api/transactions/transactions/cancel")
    suspend fun cancelTransaction(@Body body: Map<String, String>): Response<Map<String, Any>>

    @GET("/api/transactions/transactions")
    suspend fun getTransactionHistory(): Response<Map<String, Any>>

    @GET("/api/transactions/transactions/{id}/receipt")
    suspend fun getReceipt(@Path("id") transactionId: String): Response<Map<String, Any>>
}

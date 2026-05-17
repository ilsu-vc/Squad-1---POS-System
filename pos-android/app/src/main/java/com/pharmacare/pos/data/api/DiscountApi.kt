package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

data class ValidateDiscountRequest(
    val code: String,
    val cartTotal: Double,
    val cashierId: String? = null
)

data class DiscountInfo(
    val code: String,
    val type: String, // 'percentage' or 'fixed'
    val value: Double,
    val computedDiscount: Double,
    val description: String?
)

data class ValidateDiscountResponse(
    val valid: Boolean,
    val discount: DiscountInfo? = null,
    val reason: String? = null,
    val error: String? = null
)

interface DiscountApi {
    @POST("/api/transactions/discounts/validate")
    suspend fun validateDiscount(@Body body: ValidateDiscountRequest): Response<ValidateDiscountResponse>
}

package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

data class ActivityLogRequest(
    val userId: String,
    val userEmail: String,
    val actionType: String,
    val actionDetails: String,
    val entityType: String,
    val entityId: String
)

interface ReportingApi {
    @POST("/api/reporting/activity")
    suspend fun logActivity(@Body body: ActivityLogRequest): Response<Map<String, Any>>

    @GET("/api/reporting/summary/daily")
    suspend fun getDailySummary(): Response<Map<String, Any>>
}

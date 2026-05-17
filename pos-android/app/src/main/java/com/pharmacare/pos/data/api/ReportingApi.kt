package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

data class ActivityLogRequest(
    val userId: String,
    val userEmail: String,
    val actionType: String,
    val actionDetails: String,
    val entityType: String,
    val entityId: String? = null
)

interface ReportingApi {
    @POST("/api/reporting/activity-logs")
    suspend fun logActivity(@Body body: ActivityLogRequest): Response<Map<String, Any>>

    @GET("/api/reporting/activity-logs")
    suspend fun getActivityLogs(): Response<Map<String, Any>>

    @GET("/api/reporting/shift-records")
    suspend fun getShiftRecords(): Response<Map<String, Any>>
}

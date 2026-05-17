package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.*

data class ClockInRequest(val userId: String)

data class ClockOutRequest(
    val shiftId: Any,          // can be String or Int from server
    val userId: String,
    val clockOutAt: String,    // ISO-8601 with offset e.g. "2026-05-08T03:00:00+08:00"
    val totalHours: Double?,
    val handoverNotes: String?,
    val cashDiscrepancies: String?,
    val issues: String?,
    val pendingItems: String?
)

data class ShiftRecord(
    val id: Any?,
    val user_id: String?,
    val clock_in_at: String?,
    val clock_out_at: String?,
    val total_hours: Double?,
    val handover_notes: String?,
    val cash_discrepancies: String?,
    val issues: String?,
    val pending_items: String?,
    val created_at: String?
)

data class ShiftResponse(val shift: ShiftRecord?)
data class ClockOutResponse(val success: Boolean)

interface ShiftApi {

    @POST("shift/clock-in")
    suspend fun clockIn(@Body body: ClockInRequest): Response<ShiftResponse>

    @POST("shift/clock-out")
    suspend fun clockOut(@Body body: ClockOutRequest): Response<ClockOutResponse>

    @GET("shift/active/{userId}")
    suspend fun getActiveShift(@Path("userId") userId: String): Response<ShiftResponse>
}

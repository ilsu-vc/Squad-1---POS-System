package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.*

data class UpdateRoleRequest(val role: String)
data class ToggleActiveRequest(val is_active: Boolean)
data class ResetPasswordRequest(val email: String)

interface UserApi {
    @GET("/api/roles/users")
    suspend fun getUsers(): Response<Map<String, Any>>

    @GET("/api/roles/users/{userId}")
    suspend fun getUser(@Path("userId") userId: String): Response<Map<String, Any>>

    @PUT("/api/roles/users/{userId}/role")
    suspend fun updateUserRole(
        @Path("userId") userId: String,
        @Body body: UpdateRoleRequest
    ): Response<Map<String, Any>>

    @PUT("/api/roles/users/{userId}/active")
    suspend fun toggleActive(
        @Path("userId") userId: String,
        @Body body: ToggleActiveRequest
    ): Response<Map<String, Any>>

    @POST("/api/roles/users/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): Response<Map<String, Any>>
}

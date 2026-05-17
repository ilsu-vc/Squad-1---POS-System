package com.pharmacare.pos.util

import com.pharmacare.pos.data.api.ActivityLogRequest
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.auth.SupabaseManager
import io.github.jan.supabase.gotrue.auth

object ActivityLogger {
    suspend fun log(
        actionType: String,
        actionDetails: String,
        entityType: String,
        entityId: String? = null
    ) {
        try {
            val user = SupabaseManager.client.auth.currentUserOrNull() ?: return
            val email = user.email ?: "Unknown User"
            
            ApiClient.reportingApi.logActivity(
                ActivityLogRequest(
                    userId = user.id,
                    userEmail = email,
                    actionType = actionType,
                    actionDetails = actionDetails,
                    entityType = entityType,
                    entityId = entityId
                )
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

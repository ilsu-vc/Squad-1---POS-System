package com.pharmacare.pos.data.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.pharmacare.pos.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.FlowType
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseManager {
    lateinit var client: SupabaseClient
        private set

    fun initialize(context: Context) {
        client = createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth) {
                flowType = FlowType.PKCE
                scheme = "pharmacare"
                host = "auth"
            }
            install(Postgrest)
        }
    }

    fun getAccessToken(): String? {
        return client.auth.currentSessionOrNull()?.accessToken
    }

    /**
     * Extracts the role from Supabase user metadata.
     * Handles both plain string and JsonPrimitive-wrapped values.
     */
    fun getUserRole(): String {
        val session = client.auth.currentSessionOrNull() ?: return "cashier"
        val metadata = session.user?.userMetadata ?: return "cashier"
        
        val rawRole = metadata["role"] ?: metadata["user_role"]
        
        if (rawRole != null) {
            val parsed = rawRole.toString().trim().removeSurrounding("\"").lowercase()
            if (parsed.isNotEmpty() && parsed != "null") return parsed
        }

        // Fallback: If metadata is completely missing but the email clearly indicates an admin/manager,
        // we grant them the appropriate role so the UI isn't blocked.
        val email = session.user?.email ?: ""
        if (email.contains("admin", ignoreCase = true)) return "admin"
        if (email.contains("manager", ignoreCase = true)) return "manager"

        return "cashier"
    }
}

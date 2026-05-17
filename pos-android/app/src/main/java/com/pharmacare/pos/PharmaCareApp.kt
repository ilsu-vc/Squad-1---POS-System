package com.pharmacare.pos

import android.app.Application
import com.pharmacare.pos.data.auth.SupabaseManager

class PharmaCareApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Supabase on app startup
        SupabaseManager.initialize(this)
    }
}

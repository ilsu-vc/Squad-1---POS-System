package com.pharmacare.pos.data.api

import com.pharmacare.pos.BuildConfig
import com.pharmacare.pos.data.auth.SupabaseManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private val authInterceptor = Interceptor { chain ->
        val requestBuilder = chain.request().newBuilder()
        // Add Authorization header if we have a token
        SupabaseManager.getAccessToken()?.let { token ->
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }
        chain.proceed(requestBuilder.build())
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    // API Services
    val productApi: ProductApi = retrofit.create(ProductApi::class.java)
    val transactionApi: TransactionApi = retrofit.create(TransactionApi::class.java)
    val reportingApi: ReportingApi = retrofit.create(ReportingApi::class.java)
}

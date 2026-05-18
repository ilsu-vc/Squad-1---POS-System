package com.pharmacare.pos.data.api

import android.content.Context
import com.pharmacare.pos.BuildConfig
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.util.PrintManager
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private val authInterceptor = Interceptor { chain ->
        val requestBuilder = chain.request().newBuilder()
        val token = runBlocking {
            SupabaseManager.client.auth.currentAccessTokenOrNull()
        }
        token?.let {
            requestBuilder.addHeader("Authorization", "Bearer $it")
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

    private var retrofit: Retrofit = buildRetrofit(BuildConfig.API_BASE_URL)
    private var authRetrofit: Retrofit = buildRetrofit(getAuthUrl(BuildConfig.API_BASE_URL))

    // Dynamic API Services
    var productApi: ProductApi = retrofit.create(ProductApi::class.java)
        private set
    var transactionApi: TransactionApi = retrofit.create(TransactionApi::class.java)
        private set
    var reportingApi: ReportingApi = retrofit.create(ReportingApi::class.java)
        private set
    var userApi: UserApi = retrofit.create(UserApi::class.java)
        private set
    var transferApi: TransferApi = retrofit.create(TransferApi::class.java)
        private set
    var discountApi: DiscountApi = retrofit.create(DiscountApi::class.java)
        private set
    var shiftApi: ShiftApi = authRetrofit.create(ShiftApi::class.java)
        private set

    private fun buildRetrofit(url: String): Retrofit {
        val sanitizedUrl = if (url.endsWith("/")) url else "$url/"
        return Retrofit.Builder()
            .baseUrl(sanitizedUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    private fun getAuthUrl(baseUrl: String): String {
        return (if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/") + "api/auth/"
    }

    /**
     * Call this to initialize from saved preferences on startup
     */
    fun init(context: Context) {
        val savedIp = PrintManager.getApiIp(context)
        if (!savedIp.isNullOrBlank()) {
            updateBaseUrl(savedIp)
        }
    }

    /**
     * Call this to update the backend IP address at runtime
     */
    fun updateBaseUrl(newIp: String) {
        var url = newIp.trim()
        if (!url.startsWith("http")) {
            url = "http://$url"
        }
        // If no port is specified, default to 3031 (POS API Gateway)
        // We check if there's a colon after the http:// or https:// prefix
        val hasPort = if (url.startsWith("https://")) {
            url.substring(8).contains(":")
        } else {
            url.substring(7).contains(":")
        }
        
        if (!hasPort) {
            url = "$url:3031"
        }

        retrofit = buildRetrofit(url)
        authRetrofit = buildRetrofit(getAuthUrl(url))

        // Re-instantiate all APIs with the new Retrofit instance
        productApi = retrofit.create(ProductApi::class.java)
        transactionApi = retrofit.create(TransactionApi::class.java)
        reportingApi = retrofit.create(ReportingApi::class.java)
        userApi = retrofit.create(UserApi::class.java)
        transferApi = retrofit.create(TransferApi::class.java)
        discountApi = retrofit.create(DiscountApi::class.java)
        shiftApi = authRetrofit.create(ShiftApi::class.java)
    }
}

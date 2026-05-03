package com.pharmacare.pos.data.api

import com.pharmacare.pos.data.model.Product
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface ProductApi {
    @GET("/api/products/products")
    suspend fun getProducts(
        @Query("categoryId") categoryId: String? = null,
        @Query("search") search: String? = null
    ): Response<com.pharmacare.pos.data.model.ProductsResponse>

    @GET("/api/products/categories")
    suspend fun getCategories(): Response<List<Map<String, Any>>>

    @GET("/api/products/products/sku/{sku}")
    suspend fun getProductBySku(@Path("sku") sku: String): Response<Map<String, Product>>
}

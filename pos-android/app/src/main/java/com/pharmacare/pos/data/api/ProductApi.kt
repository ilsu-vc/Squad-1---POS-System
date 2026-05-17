package com.pharmacare.pos.data.api

import com.pharmacare.pos.data.model.Product
import com.pharmacare.pos.data.model.ProductsResponse
import retrofit2.Response
import retrofit2.http.*

data class DecrementStockRequest(val quantity: Int)
data class DecrementStockResponse(val success: Boolean, val newStock: Int)
data class UpdateProductRequest(
    val name: String? = null,
    val price: Double? = null,
    val stock: Int? = null,
    val category: String? = null,
    val low_stock_threshold: Int? = null
)

interface ProductApi {

    // GET /api/products/products  → inventory-service GET /products
    @GET("api/products/products")
    suspend fun getProducts(
        @Query("categoryId") categoryId: String? = null,
        @Query("search") search: String? = null
    ): Response<ProductsResponse>

    // GET /api/products/products/:sku  → inventory-service GET /products/:sku
    @GET("api/products/products/{id}")
    suspend fun getProduct(@Path("id") id: String): Response<Map<String, Product>>

    // GET /api/products/products/:sku/stock
    @GET("api/products/products/{id}/stock")
    suspend fun getProductStock(@Path("id") id: String): Response<Map<String, Any>>

    // GET /api/products/branches
    @GET("api/products/branches")
    suspend fun getBranches(): Response<Map<String, Any>>

    // PUT /api/products/products/:id  → update name/price/stock/category
    @PUT("api/products/products/{id}")
    suspend fun updateProduct(
        @Path("id") id: String,
        @Body body: UpdateProductRequest
    ): Response<Map<String, Any>>

    // PATCH /api/products/products/:id/decrement → subtract stock (used after sale)
    @PATCH("api/products/products/{id}/decrement")
    suspend fun decrementStock(
        @Path("id") id: String,
        @Body body: DecrementStockRequest
    ): Response<DecrementStockResponse>
}

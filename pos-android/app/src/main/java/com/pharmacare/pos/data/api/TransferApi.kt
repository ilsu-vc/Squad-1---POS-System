package com.pharmacare.pos.data.api

import retrofit2.Response
import retrofit2.http.*

data class TransferItem(
    val id: Int? = null,
    val product_id: Int,
    val product_name: String? = null,
    val quantity_transfer: Int,
    val transfer_status: String? = "Pending",
    val requested_by: String? = null,
    val destination_branch_id: Int? = null,
    val destination_branch_name: String? = null,
    val created_at: String? = null
)

data class TransferListResponse(val transfers: List<TransferItem>)
data class TransferResponse(val transfer: TransferItem)

data class CreateTransferRequest(
    val product_id: Int,
    val product_name: String,
    val quantity_transfer: Int,
    val transfer_status: String = "Pending",
    val requested_by: String? = null,
    val destination_branch_id: Int? = null,
    val destination_branch_name: String? = null
)

data class UpdateTransferRequest(
    val transfer_status: String? = null,
    val quantity_transfer: Int? = null
)

interface TransferApi {
    // GET /api/products/transfers
    @GET("api/products/transfers")
    suspend fun getTransfers(): Response<TransferListResponse>

    // POST /api/products/transfers
    @POST("api/products/transfers")
    suspend fun createTransfer(@Body body: CreateTransferRequest): Response<TransferResponse>

    // PUT /api/products/transfers/:id
    @PUT("api/products/transfers/{id}")
    suspend fun updateTransfer(
        @Path("id") id: Int,
        @Body body: UpdateTransferRequest
    ): Response<TransferResponse>
}

package com.pharmacare.pos.data.model

import com.google.gson.annotations.SerializedName

/**
 * Exactly matches inventory-service GET /products response:
 * {
 *   id: number,
 *   name: string,
 *   price: number,
 *   stock: number,
 *   category: string,
 *   low_stock_threshold: number,
 *   reserved_transfer_qty: number,
 *   available_stock: number
 * }
 */
data class Product(
    @SerializedName("id")                  val id: Int,
    @SerializedName("name")                val name: String,
    @SerializedName("price")               val price: Double,
    @SerializedName("stock")               val stock: Int,
    @SerializedName("category")            val categoryId: String? = null,
    @SerializedName("low_stock_threshold") val lowStockThreshold: Int? = 10,
    @SerializedName("reserved_transfer_qty") val reservedQty: Int? = 0,
    @SerializedName("available_stock")     val availableStock: Int? = null
) {
    /** String form of id for use in API paths */
    val idStr: String get() = id.toString()

    /** Returns available_stock when present, else raw stock */
    val displayStock: Int get() = availableStock ?: stock

    // Legacy compat — some parts of the UI reference these
    val sku: String get() = ""
}

data class ProductsResponse(
    val products: List<Product>,
    val transfers: List<Map<String, Any>>? = null
)

data class CartItem(
    val product: Product,
    var quantity: Int,
    var discountType: String? = null,
    var discountValue: Double? = null
) {
    val originalPrice: Double
        get() = product.price * quantity

    val finalPrice: Double
        get() {
            var total = originalPrice
            if (discountType == "percentage" && discountValue != null) {
                total -= total * (discountValue!! / 100.0)
            } else if (discountType == "fixed" && discountValue != null) {
                total -= discountValue!!
            }
            return if (total < 0) 0.0 else total
        }
}

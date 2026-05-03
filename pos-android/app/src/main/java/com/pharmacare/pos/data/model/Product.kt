package com.pharmacare.pos.data.model

import com.google.gson.annotations.SerializedName

data class Product(
    val id: String,
    val sku: String,
    val name: String,
    val description: String?,
    @SerializedName("category_id") val categoryId: String?,
    val price: Double,
    val stock: Int,
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("image_url") val imageUrl: String?
)

data class ProductsResponse(
    val products: List<Product>
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

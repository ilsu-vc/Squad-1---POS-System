package com.pharmacare.pos.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.google.gson.Gson
import androidx.room.TypeConverter

@Entity(tableName = "offline_transactions")
data class OfflineTransaction(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val transactionId: String,
    val vat: Double,
    val subtotal: Double,
    val totalAmount: Double,
    val itemsJson: String, // Storing items as JSON string
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "local_products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val name: String,
    val price: Double,
    val stock: Int,
    val category: String,
    val sku: String
)

@Entity(tableName = "held_orders")
data class HeldOrder(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val itemsJson: String,
    val totalAmount: Double,
    val timestamp: Long = System.currentTimeMillis()
)

class Converters {
    @TypeConverter
    fun fromStringList(value: String): List<String> {
        return Gson().fromJson(value, Array<String>::class.java).toList()
    }

    @TypeConverter
    fun fromList(list: List<String>): String {
        return Gson().toJson(list)
    }
}

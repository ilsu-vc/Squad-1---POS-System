package com.pharmacare.pos.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    @Insert
    suspend fun insert(transaction: OfflineTransaction)

    @Query("SELECT * FROM offline_transactions ORDER BY timestamp ASC")
    suspend fun getAllQueued(): List<OfflineTransaction>

    @Delete
    suspend fun delete(transaction: OfflineTransaction)
}

@Dao
interface ProductDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(products: List<ProductEntity>)

    @Query("SELECT * FROM local_products")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("UPDATE local_products SET stock = stock - :amount WHERE id = :id")
    suspend fun decrementStock(id: String, amount: Int)

    @Query("DELETE FROM local_products")
    suspend fun clearAll()
}

@Dao
interface HeldOrderDao {
    @Insert
    suspend fun insert(order: HeldOrder)

    @Query("SELECT * FROM held_orders ORDER BY timestamp DESC")
    fun getAllHeld(): kotlinx.coroutines.flow.Flow<List<HeldOrder>>

    @Delete
    suspend fun delete(order: HeldOrder)
}

@Database(entities = [OfflineTransaction::class, ProductEntity::class, HeldOrder::class], version = 2)
abstract class AppDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun productDao(): ProductDao
    abstract fun heldOrderDao(): HeldOrderDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: android.content.Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "pos_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

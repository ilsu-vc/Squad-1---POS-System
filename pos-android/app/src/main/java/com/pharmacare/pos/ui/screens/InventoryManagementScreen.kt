package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.api.CreateTransferRequest
import com.pharmacare.pos.data.api.UpdateTransferRequest
import com.pharmacare.pos.data.api.TransferItem
import com.pharmacare.pos.data.model.Product
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.window.Dialog
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryManagementScreen() {
    var activeTab by remember { mutableStateOf("Local Stock") }

    Column(modifier = Modifier.fillMaxSize().background(SurfaceLight)) {
        // ── Sub-tab bar (matches web InventoryManagementView) ────────────────
        Surface(color = White, shadowElevation = 1.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                listOf(
                    "Local Stock" to Icons.Default.Inventory2,
                    "Transfer Requests" to Icons.Default.SwapHoriz
                ).forEach { (label, icon) ->
                    val isSel = activeTab == label
                    Surface(
                        modifier = Modifier.clickable { activeTab = label }.height(40.dp),
                        color = if (isSel) Primary else SurfaceLight,
                        shape = RoundedCornerShape(10.dp),
                        border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(icon, null, tint = if (isSel) White else TextSecondary, modifier = Modifier.size(18.dp))
                            Text(label, color = if (isSel) White else TextSecondary, fontSize = 13.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }
        }

        when (activeTab) {
            "Transfer Requests" -> BranchTransferScreen()
            else -> InventoryLocalStockTab()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryLocalStockTab() {
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }
    var selectedCategory by remember { mutableStateOf("All") }
    val coroutineScope = rememberCoroutineScope()

    val categories = listOf("All", "OTC Medications", "Vitamins & Supplements", "Personal Care", "First Aid", "Health & Wellness", "Baby Care")

    fun mockInventoryProducts(): List<Product> = listOf(
        Product(id = 1,  name = "Amoxicillin 500mg",   price = 85.00,  stock = 120, categoryId = "OTC Medications",       lowStockThreshold = 20),
        Product(id = 2,  name = "Paracetamol 500mg",   price = 25.00,  stock = 250, categoryId = "OTC Medications",       lowStockThreshold = 30),
        Product(id = 3,  name = "Vitamin C 500mg",     price = 115.00, stock = 8,   categoryId = "Vitamins & Supplements", lowStockThreshold = 15),
        Product(id = 4,  name = "Mefenamic Acid 500mg",price = 300.25, stock = 45,  categoryId = "OTC Medications",       lowStockThreshold = 10),
        Product(id = 5,  name = "Biogesic 500mg",      price = 120.00, stock = 0,   categoryId = "OTC Medications",       lowStockThreshold = 10),
        Product(id = 6,  name = "Ascorbic Acid 1000mg",price = 180.00, stock = 60,  categoryId = "Vitamins & Supplements", lowStockThreshold = 10),
        Product(id = 7,  name = "Ibuprofen 400mg",     price = 45.00,  stock = 90,  categoryId = "OTC Medications",       lowStockThreshold = 10),
        Product(id = 8,  name = "Cetirizine 10mg",     price = 18.00,  stock = 5,   categoryId = "OTC Medications",       lowStockThreshold = 15),
        Product(id = 9,  name = "Zinc Supplements",    price = 95.00,  stock = 130, categoryId = "Vitamins & Supplements", lowStockThreshold = 10),
        Product(id = 10, name = "Hand Sanitizer 250ml",price = 75.00,  stock = 40,  categoryId = "Personal Care",         lowStockThreshold = 10),
        Product(id = 11, name = "Bandage Roll 4in",    price = 55.00,  stock = 25,  categoryId = "First Aid",             lowStockThreshold = 10),
        Product(id = 12, name = "Azithromycin 500mg",  price = 450.00, stock = 20,  categoryId = "OTC Medications",       lowStockThreshold = 10),
    )



    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun fetchProducts() {
        loading = true
        errorMessage = null
        coroutineScope.launch {
            try {
                val response = ApiClient.productApi.getProducts()
                if (response.isSuccessful) {
                    products = response.body()?.products ?: emptyList()
                    if (products.isEmpty()) {
                        errorMessage = "No products found in inventory."
                    }
                } else {
                    errorMessage = "Failed to load inventory (Error ${response.code()})"
                }
            } catch (e: Exception) {
                errorMessage = "Network error: ${e.message}"
            } finally {
                loading = false
            }
        }
    }


    LaunchedEffect(Unit) { fetchProducts() }

    val filtered = products.filter {
        val matchSearch = it.name.contains(searchQuery, ignoreCase = true) || it.sku.contains(searchQuery, ignoreCase = true)
        val matchCat = selectedCategory == "All" || it.categoryId == selectedCategory
        matchSearch && matchCat
    }

    // Summary stats
    val totalProducts = products.size
    val lowStockCount = products.count { p -> p.displayStock in 1..(p.lowStockThreshold ?: 10) }
    val outOfStockCount = products.count { it.displayStock <= 0 }
    val totalValue = products.sumOf { it.price * it.displayStock }

    LazyColumn(modifier = Modifier.fillMaxSize().background(SurfaceLight), contentPadding = PaddingValues(24.dp)) {
        item {
            // Header
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                Text("Inventory Management", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Monitor and manage your product stock", color = TextMuted, fontSize = 14.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = { fetchProducts() },
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Refresh", color = TextPrimary)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Stats row
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            InventoryStatCard("Total Products", totalProducts.toString(), Primary, Modifier.weight(1f))
            InventoryStatCard("Low Stock", lowStockCount.toString(), Warning, Modifier.weight(1f))
            InventoryStatCard("Out of Stock", outOfStockCount.toString(), Error, Modifier.weight(1f))
            InventoryStatCard("Stock Value", "₱${String.format("%,.0f", totalValue)}", Color(0xFF10B981), Modifier.weight(1f))
        }

        Spacer(Modifier.height(16.dp))

        // Search + filter row
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search by name or SKU...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(10.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = White, focusedBorderColor = Primary, unfocusedBorderColor = Border)
            )
        }

        Spacer(Modifier.height(8.dp))

        // Category filter chips
        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(categories) { cat ->
                val isSel = selectedCategory == cat
                Surface(
                    modifier = Modifier.clickable { selectedCategory = cat }.height(36.dp),
                    color = if (isSel) Primary else White,
                    shape = RoundedCornerShape(18.dp),
                    border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 16.dp)) {
                        Text(cat, color = if (isSel) White else TextSecondary, fontSize = 13.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // Table header
        Surface(color = Primary.copy(alpha = 0.06f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                Text("Product Name",  modifier = Modifier.weight(2f),   fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text("ID",            modifier = Modifier.weight(0.8f),  fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text("Category",      modifier = Modifier.weight(1.5f),  fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text("Stock / Avail", modifier = Modifier.weight(1f),   fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text("Price",         modifier = Modifier.weight(0.8f),  fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text("Status",        modifier = Modifier.weight(0.8f),  fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
                Text("Actions",       modifier = Modifier.weight(1f),    fontWeight = FontWeight.Bold, fontSize = 13.sp, color = TextPrimary)
            }
        }
        } // closes item

        if (loading) {
            item { Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) { CircularProgressIndicator(color = Primary) } }
        } else if (errorMessage != null) {
            item { Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) { 
                Text(errorMessage!!, color = Error, fontSize = 16.sp, fontWeight = FontWeight.Bold) 
            } }
        } else {
            items(filtered) { product ->
                val threshold = product.lowStockThreshold ?: 10
                    val stockStatus = when {
                        product.displayStock <= 0 -> Triple("Out of Stock", Error, Color(0xFFFEE2E2))
                        product.displayStock <= threshold -> Triple("Low Stock", Warning, Color(0xFFFEF3C7))
                        else -> Triple("In Stock", Color(0xFF10B981), Color(0xFFD1FAE5))
                    }
                    Surface(
                        color = White,
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(2f)) {
                                Text(product.name, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                if ((product.reservedQty ?: 0) > 0) {
                                    Text("${product.reservedQty} reserved for transfer", color = Warning, fontSize = 11.sp)
                                }
                            }
                            Text(product.idStr, modifier = Modifier.weight(0.8f), color = TextMuted, fontSize = 12.sp)
                            Text(product.categoryId ?: "—", modifier = Modifier.weight(1.5f), color = TextSecondary, fontSize = 13.sp)
                            // Stock / Available
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    product.displayStock.toString(),
                                    color = when {
                                        product.displayStock <= 0 -> Error
                                        product.displayStock <= threshold -> Warning
                                        else -> Color(0xFF10B981)
                                    },
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 14.sp
                                )
                                if ((product.reservedQty ?: 0) > 0) {
                                    Text("(${product.stock} raw)", color = TextMuted, fontSize = 10.sp)
                                }
                            }
                            Text("₱${String.format("%.2f", product.price)}", modifier = Modifier.weight(0.8f), color = TextPrimary, fontSize = 13.sp)
                            Box(modifier = Modifier.weight(0.8f)) {
                                Surface(color = stockStatus.third, shape = RoundedCornerShape(6.dp)) {
                                    Text(stockStatus.first, color = stockStatus.second, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                            Row(modifier = Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Surface(
                                    color = Primary.copy(alpha = 0.08f),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.clickable { editingProduct = product }
                                ) {
                                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Edit, contentDescription = null, tint = Primary, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text("Edit", color = Primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                } // closes Surface 280
                            } // closes Row 279
                        } // closes Row 245
                    } // closes Surface 239
                    Spacer(Modifier.height(4.dp))
                } // closes items 232
            } // closes else 231
        } // closes LazyColumn 145

    // Edit Product Dialog
    editingProduct?.let { product ->
        EnhancedEditProductDialog(
            product = product,
            onDismiss = { editingProduct = null },
            onSave = { updated ->
                coroutineScope.launch {
                    try {
                        val response = ApiClient.productApi.updateProduct(
                            updated.idStr,
                            com.pharmacare.pos.data.api.UpdateProductRequest(
                                name = updated.name,
                                price = updated.price,
                                stock = updated.stock,
                                category = updated.categoryId
                            )
                        )
                        editingProduct = null
                        fetchProducts() // always refresh after attempt
                    } catch (_: Exception) {
                        // Update locally while offline
                        products = products.map { if (it.id == updated.id) updated else it }
                        editingProduct = null
                    }
                }
            }
        )
    }
}

@Composable
private fun InventoryStatCard(title: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(color = White, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Text(title, color = TextMuted, fontSize = 12.sp)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EnhancedEditProductDialog(
    product: Product,
    onDismiss: () -> Unit,
    onSave: (Product) -> Unit
) {
    var name by remember { mutableStateOf(product.name) }
    var price by remember { mutableStateOf(product.price.toString()) }
    var stock by remember { mutableStateOf(product.stock.toString()) }
    var adjustment by remember { mutableStateOf("0") }
    var adjustMode by remember { mutableStateOf("set") } // "set" or "adjust"

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Inventory, contentDescription = null, tint = Primary, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(8.dp))
                Text("Edit Product", fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(androidx.compose.foundation.rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Product info header
                Surface(color = SurfaceLight, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("SKU: ${product.sku}", color = TextMuted, fontSize = 12.sp)
                        Text(product.categoryId ?: "Uncategorized", color = Primary, fontSize = 12.sp)
                    }
                }

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Product Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Price (₱)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )

                HorizontalDivider(color = Border)
                Text("Stock Management", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)

                // Mode toggle
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("set" to "Set Exact", "adjust" to "Adjust (+/-)").forEach { (mode, label) ->
                        val isSel = adjustMode == mode
                        Surface(
                            modifier = Modifier.weight(1f).clickable { adjustMode = mode }.height(40.dp),
                            color = if (isSel) Primary else SurfaceLight,
                            shape = RoundedCornerShape(8.dp),
                            border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(label, color = if (isSel) White else TextSecondary, fontSize = 13.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                            }
                        }
                    }
                }

                if (adjustMode == "set") {
                    OutlinedTextField(
                        value = stock,
                        onValueChange = { stock = it.filter { c -> c.isDigit() } },
                        label = { Text("Stock Level") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                    )
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Current: ${product.stock}", color = TextMuted, fontSize = 13.sp)
                        Row(
                            modifier = Modifier.background(SurfaceHover, RoundedCornerShape(8.dp)),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = { adjustment = ((adjustment.toIntOrNull() ?: 0) - 1).toString() }) {
                                Text("-", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 20.sp)
                            }
                            Text(adjustment, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(horizontal = 8.dp))
                            IconButton(onClick = { adjustment = ((adjustment.toIntOrNull() ?: 0) + 1).toString() }) {
                                Text("+", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 20.sp)
                            }
                        }
                        val newStock = (product.stock + (adjustment.toIntOrNull() ?: 0)).coerceAtLeast(0)
                        Text("→ $newStock", color = Primary, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalStock = if (adjustMode == "set") {
                        stock.toIntOrNull() ?: product.stock
                    } else {
                        (product.stock + (adjustment.toIntOrNull() ?: 0)).coerceAtLeast(0)
                    }
                    onSave(product.copy(name = name, price = price.toDoubleOrNull() ?: product.price, stock = finalStock))
                },
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                shape = RoundedCornerShape(8.dp)
            ) { Text("Save Changes") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = TextMuted) }
        },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

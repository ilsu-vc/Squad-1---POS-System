package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.local.OfflineTransaction
import com.pharmacare.pos.data.model.CartItem
import com.pharmacare.pos.data.model.Product
import com.pharmacare.pos.ui.components.*
import com.pharmacare.pos.ui.theme.*
import com.pharmacare.pos.util.ActivityLogger
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSScreen(navController: NavHostController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val database = remember { com.pharmacare.pos.data.local.AppDatabase.getDatabase(context) }
    val networkMonitor = remember { com.pharmacare.pos.util.NetworkMonitor(context) }
    val isOnline by networkMonitor.isOnline.collectAsState(initial = true)
    val coroutineScope = rememberCoroutineScope()

    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var cart by remember { mutableStateOf<List<CartItem>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var activeCategory by remember { mutableStateOf("All") }
    var loading by remember { mutableStateOf(true) }
    var submitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showScanner by remember { mutableStateOf(false) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var showPaymentDialog by remember { mutableStateOf(false) }
    var showGiftReceipt by remember { mutableStateOf(false) }
    var heldOrdersCount by remember { mutableStateOf(0) }
    var lastReceiptNumber by remember { mutableStateOf("") }
    var lastItems by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var lastChangeAmount by remember { mutableStateOf(0.0) }

    // Shift enforcement
    var isShiftActive by remember { mutableStateOf(true) } // TODO: pull from shift state
    var showShiftAlert by remember { mutableStateOf(false) }

    // Discount
    var discountCode by remember { mutableStateOf("") }
    var discountAmount by remember { mutableStateOf(0.0) }
    var discountValidating by remember { mutableStateOf(false) }
    var discountMsg by remember { mutableStateOf("") }
    var discountValid by remember { mutableStateOf(false) }

    // Stock alert
    var stockAlert by remember { mutableStateOf<Triple<String, Int, Boolean>?>(null) } // name, stock, isNoStock

    val categoriesList = listOf("All", "OTC Medications", "Vitamins & Supplements", "Personal Care", "First Aid", "Health & Wellness", "Baby Care")
    val subtotal = cart.sumOf { it.finalPrice }
    val tax = subtotal * 0.12
    val total = subtotal + tax - discountAmount

    LaunchedEffect(Unit) {
        try {
            val response = ApiClient.productApi.getProducts()
            if (response.isSuccessful) {
                val fetched = response.body()?.products ?: emptyList()
                products = fetched
                database.productDao().clearAll()
                database.productDao().insertAll(fetched.map {
                    com.pharmacare.pos.data.local.ProductEntity(it.idStr, it.name, it.price, it.stock, it.categoryId ?: "Uncategorized", it.sku)
                })
            } else {
                database.productDao().getAllProducts().collect { local ->
                    products = local.map { Product(id = it.id.toIntOrNull() ?: 0, name = it.name, price = it.price, stock = it.stock, categoryId = it.category) }
                }
            }
        } catch (e: Exception) {
            try {
                database.productDao().getAllProducts().collect { local ->
                    products = local.map { Product(id = it.id.toIntOrNull() ?: 0, name = it.name, price = it.price, stock = it.stock, categoryId = it.category) }
                }
            } catch (_: Exception) {}

            if (products.isEmpty()) errorMessage = "Offline — no cached products"
        } finally { loading = false }
    }

    LaunchedEffect(navController.currentBackStackEntry) {
        val json = navController.currentBackStackEntry?.savedStateHandle?.get<String>("resume_order_json")
        if (json != null) {
            val itemType = object : com.google.gson.reflect.TypeToken<List<CartItem>>() {}.type
            cart = com.google.gson.Gson().fromJson(json, itemType)
            navController.currentBackStackEntry?.savedStateHandle?.remove<String>("resume_order_json")
        }
    }

    LaunchedEffect(Unit) {
        database.heldOrderDao().getAllHeld().collect { heldOrdersCount = it.size }
    }

    val filteredProducts = products.filter {
        (activeCategory == "All" || it.categoryId == activeCategory) &&
        (it.name.contains(searchQuery, ignoreCase = true) || it.sku.contains(searchQuery, ignoreCase = true))
    }

    fun addToCart(product: Product) {
        if (!isShiftActive) { showShiftAlert = true; return }
        if (product.stock <= 0) { stockAlert = Triple(product.name, product.stock, true); return }
        val existing = cart.find { it.product.id == product.id }
        if (existing != null && existing.quantity >= product.stock) {
            stockAlert = Triple(product.name, product.stock, false); return
        }
        if (product.stock < 10) stockAlert = Triple(product.name, product.stock, false)
        cart = if (existing != null) {
            cart.map { if (it.product.id == product.id) it.copy(quantity = it.quantity + 1) else it }
        } else {
            cart + CartItem(product, 1)
        }
    }

    fun handleHoldOrder() {
        if (cart.isEmpty()) return
        coroutineScope.launch {
            val itemsJson = com.google.gson.Gson().toJson(cart)
            database.heldOrderDao().insert(
                com.pharmacare.pos.data.local.HeldOrder(
                    title = "Order — ${cart.first().product.name}...",
                    itemsJson = itemsJson,
                    totalAmount = total
                )
            )
            ActivityLogger.log(
                actionType = "ORDER_HELD",
                actionDetails = "Held order with ${cart.size} item(s), total ₱${String.format("%.2f", total)}",
                entityType = "held_order",
                entityId = null
            )
            cart = emptyList()
            discountCode = ""; discountAmount = 0.0; discountValid = false; discountMsg = ""
        }
    }

    fun handleCheckout(paymentResult: PaymentResult) {
        submitting = true
        coroutineScope.launch {
            try {
                val user = com.pharmacare.pos.data.auth.SupabaseManager.client.auth.currentUserOrNull()
                val itemsList = cart.map { 
                    mapOf(
                        "product_id" to it.product.id,
                        "name" to it.product.name, 
                        "unit_price" to it.product.price, 
                        "quantity" to it.quantity, 
                        "category" to (it.product.categoryId ?: "")
                    ) 
                }
                if (isOnline) {
                    val initResp = ApiClient.transactionApi.startTransaction(com.pharmacare.pos.data.api.StartTransactionRequest(user?.id ?: "unknown"))
                    if (initResp.isSuccessful) {
                        val txnId = initResp.body()?.get("transactionId") as? String ?: ""
                        val effectiveDiscountType = paymentResult.discountType ?: if (discountValid) discountCode else null
                        val effectiveDiscountAmount = if (paymentResult.discountAmount > 0) paymentResult.discountAmount else if (discountValid) discountAmount else 0.0
                        val finalTotal = subtotal + tax - effectiveDiscountAmount

                        val completeResp = ApiClient.transactionApi.completeTransaction(
                            com.pharmacare.pos.data.api.CompleteTransactionRequest(
                                transactionId = txnId, vat = tax, subtotal = subtotal,
                                totalAmount = finalTotal, amountPaid = paymentResult.amountPaid,
                                paymentMethod = paymentResult.method, itemsCount = cart.sumOf { it.quantity },
                                items = itemsList,
                                discountType = effectiveDiscountType,
                                discountAmount = if (effectiveDiscountAmount > 0) effectiveDiscountAmount else null
                            )
                        )
                        if (completeResp.isSuccessful) {
                            lastReceiptNumber = completeResp.body()?.get("receiptNumber") as? String ?: txnId
                            lastItems = itemsList
                            lastChangeAmount = paymentResult.change

                            ActivityLogger.log(
                                actionType = "SALE",
                                actionDetails = "Completed sale worth ₱${String.format("%.2f", finalTotal)} with ${paymentResult.method} payment",
                                entityType = "transaction",
                                entityId = txnId
                            )

                            if (effectiveDiscountAmount > 0) {
                                ActivityLogger.log(
                                    actionType = "DISCOUNT_APPLIED",
                                    actionDetails = "Applied $effectiveDiscountType discount worth ₱${String.format("%.2f", effectiveDiscountAmount)} on sale $txnId",
                                    entityType = "transaction",
                                    entityId = txnId
                                )
                            }

                            // ── DECREMENT STOCK FOR EACH SOLD ITEM ──────────────────────────
                            val soldItems = cart.toList() // capture before clearing
                            coroutineScope.launch {
                                soldItems.forEach { item ->
                                    try {
                                        ApiClient.productApi.decrementStock(
                                            item.product.idStr,
                                            com.pharmacare.pos.data.api.DecrementStockRequest(quantity = item.quantity)
                                        )
                                    } catch (_: Exception) {
                                        // Best-effort — transaction already recorded
                                    }
                                }
                                // Refresh product list so UI shows updated stock
                                try {
                                    val refreshed = ApiClient.productApi.getProducts()
                                    if (refreshed.isSuccessful) {
                                        products = refreshed.body()?.products ?: products
                                    }
                                } catch (_: Exception) {}
                            }
                            
                            // Capture final confirmed values for printer
                            val finalDiscountAmount = if (paymentResult.discountAmount > 0) paymentResult.discountAmount else discountAmount
                            val finalDiscountLabel = paymentResult.discountType ?: discountCode.ifEmpty { discountMsg }

                            coroutineScope.launch {
                                com.pharmacare.pos.util.PrintManager.printReceipt(
                                    context, lastReceiptNumber, itemsList, finalTotal, 
                                    paymentResult.method, subtotal, tax, 
                                    discountAmount = finalDiscountAmount, 
                                    discountLabel = finalDiscountLabel,
                                    amountTendered = paymentResult.amountPaid,
                                    change = paymentResult.change
                                )
                            }
                            coroutineScope.launch {
                                ApiClient.reportingApi.logActivity(com.pharmacare.pos.data.api.ActivityLogRequest(
                                    userId = user?.id ?: "unknown", userEmail = user?.email ?: "unknown",
                                    actionType = "SALE", actionDetails = "Sale ₱${String.format("%.2f", total)} via ${paymentResult.method}",
                                    entityType = "transaction", entityId = txnId
                                ))
                            }
                            cart = emptyList(); discountCode = ""; discountAmount = 0.0; discountValid = false; discountMsg = ""
                            showPaymentDialog = false; showSuccessDialog = true
                        } else errorMessage = "Transaction failed"
                    }
                } else {
                    val offlineId = "LOCAL-TXN-${System.currentTimeMillis()}"
                    database.transactionDao().insert(
                        OfflineTransaction(transactionId = offlineId, vat = tax, subtotal = subtotal, totalAmount = total, itemsJson = com.google.gson.Gson().toJson(itemsList))
                    )
                    
                    // Optimistic Local Stock Update
                    coroutineScope.launch {
                        cart.forEach { item ->
                            database.productDao().decrementStock(item.product.idStr, item.quantity)
                        }
                        // Update UI state immediately
                        products = products.map { p ->
                            val sold = cart.find { it.product.id == p.id }
                            if (sold != null) {
                                p.copy(stock = p.stock - sold.quantity)
                            } else p
                        }
                    }

                    // Capture final confirmed values for offline printer
                    val finalDiscountAmount = if (paymentResult.discountAmount > 0) paymentResult.discountAmount else discountAmount
                    val finalDiscountLabel = paymentResult.discountType ?: discountCode.ifEmpty { discountMsg }
                    val finalTotal = subtotal + tax - finalDiscountAmount

                    lastReceiptNumber = offlineId; lastItems = itemsList
                    lastChangeAmount = paymentResult.change
                    coroutineScope.launch {
                        com.pharmacare.pos.util.PrintManager.printReceipt(
                            context, lastReceiptNumber, itemsList, finalTotal, 
                            "${paymentResult.method} (Offline)", subtotal, tax,
                            discountAmount = finalDiscountAmount,
                            discountLabel = finalDiscountLabel,
                            amountTendered = paymentResult.amountPaid,
                            change = paymentResult.change
                        )
                    }
                    val constraints = androidx.work.Constraints.Builder().setRequiredNetworkType(androidx.work.NetworkType.CONNECTED).build()
                    androidx.work.WorkManager.getInstance(context).enqueue(
                        androidx.work.OneTimeWorkRequestBuilder<com.pharmacare.pos.data.sync.SyncWorker>().setConstraints(constraints).build()
                    )
                    cart = emptyList(); discountCode = ""; discountAmount = 0.0; discountValid = false; discountMsg = ""
                    showPaymentDialog = false; showSuccessDialog = true
                }
            } catch (e: Exception) {
                errorMessage = "Checkout failed: ${e.message}"
            } finally { submitting = false }
        }
    }


    // ── UI ──────────────────────────────────────────────────────────────────────
    Column(modifier = Modifier.fillMaxSize()) {
        if (!isOnline) {
            Surface(color = Color(0xFFEF4444), modifier = Modifier.fillMaxWidth().height(38.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text("⚡ Offline — sales saved locally and will sync when online", color = White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        if (!isShiftActive) {
            Surface(color = Warning.copy(alpha = 0.15f), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = Warning, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("No active shift. Please clock in before processing sales.", color = Warning, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Row(modifier = Modifier.fillMaxSize().background(SurfaceLight)) {
            // ── Product Panel ──
            Column(modifier = Modifier.weight(0.65f).fillMaxHeight().padding(24.dp)) {
                // Search + Scan
                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = searchQuery, onValueChange = { searchQuery = it },
                        placeholder = { Text("Search medicine or scan barcode...") },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = TextMuted) },
                        modifier = Modifier.weight(1f).height(52.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = White, focusedBorderColor = Primary, unfocusedBorderColor = Border),
                        shape = RoundedCornerShape(10.dp)
                    )
                    Button(onClick = { showScanner = true }, colors = ButtonDefaults.buttonColors(containerColor = Primary), shape = RoundedCornerShape(10.dp), modifier = Modifier.height(52.dp)) {
                        Icon(Icons.Filled.CameraAlt, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("Scan", fontWeight = FontWeight.Bold)
                    }
                }
                // Category chips
                LazyRow(modifier = Modifier.padding(bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(categoriesList) { cat ->
                        val isSel = activeCategory == cat
                        Surface(modifier = Modifier.clickable { activeCategory = cat }, color = if (isSel) Primary else White, shape = RoundedCornerShape(20.dp), border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)) {
                            Text(cat, color = if (isSel) White else TextPrimary, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp))
                        }
                    }
                }
                if (loading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Primary) }
                } else if (errorMessage != null) {
                    Box(Modifier.fillMaxSize(), Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.WifiOff, contentDescription = null, tint = TextMuted, modifier = Modifier.size(56.dp))
                            Spacer(Modifier.height(12.dp))
                            Text(errorMessage ?: "", color = TextMuted, textAlign = TextAlign.Center)
                        }
                    }
                } else {
                    LazyVerticalGrid(columns = GridCells.Fixed(3), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.weight(1f)) {
                        items(filteredProducts) { product ->
                            ProductCard(product = product, onAdd = { addToCart(product) })
                        }
                    }
                }
            }

            // ── Order Panel ──
            Column(modifier = Modifier.weight(0.35f).fillMaxHeight().background(White).border(1.dp, Border, RoundedCornerShape(0.dp))) {
                // Header
                Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Current Order", color = TextPrimary, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                        Text("${cart.sumOf { it.quantity }} items", color = TextMuted, fontSize = 13.sp)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Surface(modifier = Modifier.clickable { navController.navigate("hold_list") }, color = Color(0xFFE0F2FE), shape = RoundedCornerShape(8.dp)) {
                            Text("Held ($heldOrdersCount)", color = Color(0xFF0284C7), fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                        }
                        Surface(modifier = Modifier.clickable { cart = emptyList(); discountCode = ""; discountAmount = 0.0; discountValid = false; discountMsg = "" }, color = SurfaceHover, shape = RoundedCornerShape(8.dp)) {
                            Text("Clear", color = TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
                        }
                    }
                }

                // Cart items
                LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 20.dp)) {
                    items(cart) { item ->
                        CartItemRow(item = item,
                            onIncrement = { cart = cart.map { if (it.product.id == item.product.id) it.copy(quantity = it.quantity + 1) else it } },
                            onDecrement = { cart = cart.map { if (it.product.id == item.product.id && it.quantity > 1) it.copy(quantity = it.quantity - 1) else it }.filter { it.quantity > 0 } },
                            onRemove = { cart = cart.filter { it.product.id != item.product.id } }
                        )
                        HorizontalDivider(color = Border.copy(alpha = 0.5f))
                    }
                    if (cart.isEmpty()) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = Border, modifier = Modifier.size(48.dp))
                                    Spacer(Modifier.height(8.dp))
                                    Text("No items added", color = TextMuted, fontSize = 14.sp)
                                }
                            }
                        }
                    }
                }

                // Discount section
                Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = discountCode,
                            onValueChange = { discountCode = it.uppercase(); discountValid = false; discountMsg = "" },
                            placeholder = { Text("Discount code", fontSize = 13.sp) },
                            modifier = Modifier.weight(1f).height(44.dp),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true,
                            colors = TextFieldDefaults.outlinedTextFieldColors(
                                focusedBorderColor = if (discountValid) Success else Primary,
                                unfocusedBorderColor = if (discountValid) Success else Border,
                                containerColor = White
                            )
                        )
                        Button(
                            onClick = {
                                if (discountCode.isEmpty()) return@Button
                                discountValidating = true
                                coroutineScope.launch {
                                    try {
                                        val user = com.pharmacare.pos.data.auth.SupabaseManager.client.auth.currentUserOrNull()
                                        val resp = ApiClient.discountApi.validateDiscount(
                                            com.pharmacare.pos.data.api.ValidateDiscountRequest(
                                                code = discountCode,
                                                cartTotal = subtotal,
                                                cashierId = user?.id
                                            )
                                        )
                                        if (resp.isSuccessful && resp.body()?.valid == true) {
                                            val info = resp.body()?.discount
                                            discountAmount = info?.computedDiscount ?: 0.0
                                            discountValid = true
                                            discountMsg = info?.description ?: "Discount applied!"
                                        } else {
                                            discountAmount = 0.0
                                            discountValid = false
                                            discountMsg = resp.body()?.error ?: "Invalid discount code."
                                        }
                                    } catch (e: Exception) {
                                        discountValid = false
                                        discountMsg = "Error validating: ${e.message}"
                                    } finally { discountValidating = false }
                                }
                            },
                            enabled = discountCode.isNotEmpty() && !discountValidating,
                            colors = ButtonDefaults.buttonColors(containerColor = if (discountValid) Success else Primary),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            modifier = Modifier.height(44.dp)
                        ) {
                            if (discountValidating) CircularProgressIndicator(color = White, modifier = Modifier.size(16.dp))
                            else Text(if (discountValid) "✓" else "Apply", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    if (discountMsg.isNotEmpty()) {
                        Text(discountMsg, color = if (discountValid) Success else Error, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }

                // Totals + checkout
                Column(modifier = Modifier.fillMaxWidth().background(SurfaceLight).border(androidx.compose.foundation.BorderStroke(1.dp, Border)).padding(horizontal = 16.dp, vertical = 12.dp)) {
                    listOf(
                        Triple("Subtotal", "₱${String.format("%.2f", subtotal)}", TextSecondary),
                        Triple("VAT (12%)", "₱${String.format("%.2f", tax)}", TextSecondary)
                    ).forEach { (label, value, color) ->
                        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(label, color = color, fontSize = 12.sp)
                            Text(value, color = color, fontSize = 12.sp)
                        }
                    }
                    if (discountValid && discountAmount > 0) {
                        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Discount ($discountCode)", color = Success, fontSize = 12.sp)
                            Text("-₱${String.format("%.2f", discountAmount)}", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = Border)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("TOTAL", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold)
                        Text("₱${String.format("%.2f", total)}", color = Primary, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    Spacer(Modifier.height(10.dp))
                    Button(onClick = { if (!isShiftActive) { showShiftAlert = true } else { showPaymentDialog = true } }, enabled = cart.isNotEmpty() && !submitting, modifier = Modifier.fillMaxWidth().height(50.dp), colors = ButtonDefaults.buttonColors(containerColor = Primary), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Default.Payment, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Proceed to Payment", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(6.dp))
                    OutlinedButton(onClick = { handleHoldOrder() }, enabled = cart.isNotEmpty() && !submitting, modifier = Modifier.fillMaxWidth().height(42.dp), border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong), shape = RoundedCornerShape(10.dp)) {
                        Icon(Icons.Default.Pause, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Hold Order", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    // ── Modals ──────────────────────────────────────────────────────────────────
    if (showScanner) {
        BarcodeScannerDialog(onDismiss = { showScanner = false }, onScanned = { code ->
            showScanner = false
            val found = products.find { it.sku == code || it.name.contains(code, ignoreCase = true) }
            if (found != null) addToCart(found) else errorMessage = "Product not found for: $code"
        })
    }

    if (showPaymentDialog) {
        FullPaymentDialog(
            totalAmount = total,
            onDismiss = { showPaymentDialog = false },
            onConfirm = { result -> handleCheckout(result) }
        )
    }

    stockAlert?.let { (name, stock, isNoStock) ->
        StockAlertDialog(
            productName = name, stock = stock, threshold = 10, onHold = 0, isNoStock = isNoStock,
            onDismiss = { stockAlert = null }
        )
    }

    if (showShiftAlert) {
        AlertDialog(
            onDismissRequest = { showShiftAlert = false },
            icon = { Icon(Icons.Default.Schedule, contentDescription = null, tint = Warning, modifier = Modifier.size(32.dp)) },
            title = { Text("Shift Required", fontWeight = FontWeight.Bold) },
            text = { Text("You must clock in before processing sales. Go to Shift Management to start your shift.") },
            confirmButton = { Button(onClick = { showShiftAlert = false }, colors = ButtonDefaults.buttonColors(containerColor = Primary)) { Text("OK") } },
            containerColor = White, shape = RoundedCornerShape(16.dp)
        )
    }

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showSuccessDialog = false },
            icon = { Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Success, modifier = Modifier.size(48.dp)) },
            title = { Text("Sale Complete!", fontWeight = FontWeight.Bold, color = TextPrimary) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("Receipt #: $lastReceiptNumber", color = TextMuted, fontSize = 13.sp, textAlign = TextAlign.Center)
                    Spacer(Modifier.height(16.dp))
                    if (lastChangeAmount > 0) {
                        Text("CHANGE", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                        Text(
                            "₱${String.format("%.2f", lastChangeAmount)}",
                            color = Success,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 32.sp,
                            textAlign = TextAlign.Center
                        )
                    } else {
                        Text("No Change", color = TextMuted, fontSize = 16.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                    }
                }
            },
            confirmButton = { Button(onClick = { showSuccessDialog = false }, colors = ButtonDefaults.buttonColors(containerColor = Primary), shape = RoundedCornerShape(8.dp)) { Text("New Sale") } },
            dismissButton = {
                TextButton(onClick = { showSuccessDialog = false; showGiftReceipt = true }) {
                    Icon(Icons.Default.CardGiftcard, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Gift Receipt", color = Primary)
                }
            },
            containerColor = White, shape = RoundedCornerShape(16.dp)
        )
    }

    if (showGiftReceipt) {
        GiftReceiptDialog(
            receiptNumber = lastReceiptNumber,
            items = lastItems,
            total = total,
            onDismiss = { showGiftReceipt = false },
            onPrint = {
                coroutineScope.launch {
                    com.pharmacare.pos.util.PrintManager.printReceipt(context, lastReceiptNumber, lastItems, 0.0, "Gift Receipt", subtotal, tax)
                }
                showGiftReceipt = false
            }
        )
    }
}

// ── ProductCard ────────────────────────────────────────────────────────────────
@Composable
fun ProductCard(product: Product, onAdd: () -> Unit) {
    Surface(
        color = White,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Border),
        modifier = Modifier.fillMaxWidth().clickable { onAdd() }
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            val stockColor = when {
                product.stock <= 0 -> Error
                product.stock < 10 -> Warning
                else -> Success
            }
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Surface(color = stockColor.copy(alpha = 0.1f), shape = RoundedCornerShape(4.dp)) {
                    Text(
                        text = when { product.stock <= 0 -> "Out" ; product.stock < 10 -> "Low" ; else -> "In Stock" },
                        color = stockColor, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Stock: ${product.stock}", color = TextMuted, fontSize = 12.sp)
                    if ((product.reservedQty ?: 0) > 0) {
                        Text("Res: ${product.reservedQty}", color = Warning, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(product.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(product.categoryId ?: "General", color = TextMuted, fontSize = 12.sp)
            Spacer(Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("₱${String.format("%.2f", product.price)}", color = Primary, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Box(
                    modifier = Modifier.size(38.dp).background(Primary, CircleShape).clickable { onAdd() },
                    contentAlignment = Alignment.Center
                ) { Text("+", color = White, fontWeight = FontWeight.Bold, fontSize = 20.sp) }
            }
        }
    }
}

// ── CartItemRow ────────────────────────────────────────────────────────────────
@Composable
fun CartItemRow(item: CartItem, onIncrement: () -> Unit, onDecrement: () -> Unit, onRemove: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(item.product.name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text("₱${String.format("%.2f", item.product.price)} each", color = TextMuted, fontSize = 13.sp)
        }
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.background(SurfaceHover, RoundedCornerShape(8.dp))) {
            IconButton(onClick = onDecrement, modifier = Modifier.size(40.dp)) {
                Text("-", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            Text("${item.quantity}", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.padding(horizontal = 6.dp))
            IconButton(onClick = onIncrement, modifier = Modifier.size(40.dp)) {
                Text("+", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        }
        Spacer(Modifier.width(12.dp))
        Text("₱${String.format("%.2f", item.finalPrice)}", color = TextPrimary, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
        IconButton(onClick = onRemove, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Default.Close, contentDescription = null, tint = TextMuted.copy(alpha = 0.6f), modifier = Modifier.size(18.dp))
        }
    }
}

// ── BarcodeScannerDialog ───────────────────────────────────────────────────────
@Composable
fun BarcodeScannerDialog(onDismiss: () -> Unit, onScanned: (String) -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.QrCodeScanner, contentDescription = null, tint = Primary, modifier = Modifier.size(32.dp)) },
        title = { Text("Scan Barcode", fontWeight = FontWeight.Bold, color = TextPrimary) },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Surface(
                    color = SurfaceLight,
                    shape = RoundedCornerShape(12.dp),
                    border = androidx.compose.foundation.BorderStroke(2.dp, Primary.copy(alpha = 0.3f)),
                    modifier = Modifier.size(200.dp)
                ) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.CameraAlt, contentDescription = null, tint = TextMuted, modifier = Modifier.size(64.dp)) } }
                Spacer(Modifier.height(12.dp))
                Text("Point camera at product barcode", color = TextMuted, fontSize = 13.sp)
                Text("Camera scanner integration coming with Bluetooth printer update.", color = TextMuted, fontSize = 11.sp, textAlign = TextAlign.Center)
            }
        },
        confirmButton = { Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Primary), shape = RoundedCornerShape(8.dp)) { Text("Close") } },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

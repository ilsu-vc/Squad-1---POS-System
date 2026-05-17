package com.pharmacare.pos.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.ui.components.PartialRefundDialog
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.launch

data class TransactionRecord(
    val id: String,
    val receiptNumber: String,
    val date: String,
    val time: String,
    val totalAmount: Double,
    val paymentMethod: String,
    val itemsCount: Int,
    val items: List<Map<String, Any>>,
    val cashierName: String = "Cashier",
    val discountAmount: Double? = null,
    val discountLabel: String? = null,
    val vat: Double? = null,
    val subtotal: Double? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionHistoryScreen() {
    var transactions by remember { mutableStateOf<List<TransactionRecord>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var expandedId by remember { mutableStateOf<String?>(null) }
    var refundTxn by remember { mutableStateOf<TransactionRecord?>(null) }
    var selectedFilter by remember { mutableStateOf("All") }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var refundSuccess by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    val filters = listOf("All", "Cash", "Card", "GCash", "Split")

    fun loadTransactions() {
        loading = true
        errorMsg = null
        coroutineScope.launch {
            try {
                val response = ApiClient.transactionApi.getTransactionHistory()
                if (response.isSuccessful) {
                    val raw = response.body()?.get("transactions")
                    if (raw is List<*>) {
                        transactions = raw.mapNotNull { item ->
                            @Suppress("UNCHECKED_CAST")
                            val m = item as? Map<String, Any> ?: return@mapNotNull null
                            // Backend returns: id, receiptNumber, date (formatted), time (formatted),
                            // rawAmount, method, itemsCount, items[{name,qty,price}], subtotal, tax,
                            // discountType, discountAmount, createdAt
                            TransactionRecord(
                                id            = m["id"]?.toString() ?: "",
                                receiptNumber = m["receiptNumber"]?.toString() ?: m["id"]?.toString() ?: "",
                                date          = m["date"]?.toString() ?: "",
                                time          = m["time"]?.toString() ?: "",
                                totalAmount   = (m["rawAmount"] as? Double) ?: 0.0,
                                paymentMethod = m["method"]?.toString() ?: "Cash",
                                itemsCount    = ((m["itemsCount"] as? Double)?.toInt()) ?: 0,
                                items         = @Suppress("UNCHECKED_CAST") (m["items"] as? List<Map<String, Any>>) ?: emptyList(),
                                cashierName   = m["cashierName"]?.toString() ?: "Cashier",
                                discountAmount = m["discountAmount"] as? Double,
                                discountLabel = m["discountType"]?.toString() ?: m["discountCode"]?.toString(),
                                vat           = m["tax"] as? Double,       // backend key is "tax"
                                subtotal      = m["subtotal"] as? Double
                            )
                        }
                    }
                } else {
                    errorMsg = "Failed to load history (${response.code()})"
                }
            } catch (e: Exception) {
                errorMsg = "Network error: ${e.message}"
            } finally {
                loading = false
            }
        }
    }

    fun handleRefund(txn: TransactionRecord, selectedItems: List<Map<String, Any>>, refundAmount: Double) {
        coroutineScope.launch {
            try {
                val body = mapOf<String, Any>(
                    "refundAmount" to refundAmount,
                    "items" to selectedItems
                )
                val resp = ApiClient.transactionApi.refundTransaction(txn.id, body)
                refundSuccess = if (resp.isSuccessful) {
                    "Refund of ₱${String.format("%.2f", refundAmount)} processed successfully"
                } else {
                    "Refund failed (${resp.code()})"
                }
            } catch (e: Exception) {
                refundSuccess = "Refund error: ${e.message}"
            }
            refundTxn = null
        }
    }

    LaunchedEffect(Unit) { loadTransactions() }

    val filtered = transactions.filter { txn ->
        val matchSearch = txn.receiptNumber.contains(searchQuery, ignoreCase = true) ||
                txn.cashierName.contains(searchQuery, ignoreCase = true) ||
                txn.date.contains(searchQuery)
        val matchFilter = selectedFilter == "All" || txn.paymentMethod.contains(selectedFilter, ignoreCase = true)
        matchSearch && matchFilter
    }

    // Stats
    val totalRevenue = filtered.sumOf { it.totalAmount }
    val totalItems = filtered.sumOf { it.itemsCount }
    val avgOrder = if (filtered.isNotEmpty()) totalRevenue / filtered.size else 0.0

    LazyColumn(modifier = Modifier.fillMaxSize().background(SurfaceLight), contentPadding = PaddingValues(24.dp)) {
        item {
            // ── Header ──────────────────────────────────────────────────────────
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                Text("Transaction History", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("View and manage all past transactions", color = TextMuted, fontSize = 14.sp)
            }
            OutlinedButton(
                onClick = { loadTransactions() },
                shape = RoundedCornerShape(10.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong)
            ) {
                Icon(Icons.Default.Refresh, null, modifier = Modifier.size(18.dp), tint = TextPrimary)
                Spacer(Modifier.width(6.dp))
                Text("Refresh", color = TextPrimary)
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Success / Error banners ─────────────────────────────────────────
        refundSuccess?.let { msg ->
            val isError = msg.contains("error", ignoreCase = true) || msg.contains("failed", ignoreCase = true)
            Surface(
                color = (if (isError) Error else Success).copy(alpha = 0.1f),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(if (isError) Icons.Default.Error else Icons.Default.CheckCircle, null, tint = if (isError) Error else Success, modifier = Modifier.size(18.dp))
                    Text(msg, color = if (isError) Error else Success, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    Icon(Icons.Default.Close, null, tint = TextMuted, modifier = Modifier.size(16.dp).clickable { refundSuccess = null })
                }
            }
            Spacer(Modifier.height(10.dp))
        }

        errorMsg?.let { msg ->
            Surface(color = Error.copy(alpha = 0.1f), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Warning, null, tint = Error, modifier = Modifier.size(18.dp))
                    Text(msg, color = Error, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    Icon(Icons.Default.Close, null, tint = TextMuted, modifier = Modifier.size(16.dp).clickable { errorMsg = null })
                }
            }
            Spacer(Modifier.height(10.dp))
        }

        // ── Stats Cards ─────────────────────────────────────────────────────
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            HistoryStatCard("Transactions", filtered.size.toString(), Icons.Default.Receipt, Primary, Modifier.weight(1f))
            HistoryStatCard("Total Revenue", "₱${String.format("%,.0f", totalRevenue)}", Icons.Default.AttachMoney, Color(0xFF10B981), Modifier.weight(1f))
            HistoryStatCard("Items Sold", totalItems.toString(), Icons.Default.ShoppingBag, Color(0xFF8B5CF6), Modifier.weight(1f))
            HistoryStatCard("Avg Order", "₱${String.format("%,.0f", avgOrder)}", Icons.Default.TrendingUp, Warning, Modifier.weight(1f))
        }

        Spacer(Modifier.height(16.dp))

        // ── Search + Filter ─────────────────────────────────────────────────
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search receipt, cashier, or date...") },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = TextMuted) },
                modifier = Modifier.weight(1f).height(52.dp),
                shape = RoundedCornerShape(10.dp),
                colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = White, focusedBorderColor = Primary, unfocusedBorderColor = Border)
            )
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filters) { f ->
                    val isSel = selectedFilter == f
                    Surface(
                        modifier = Modifier.clickable { selectedFilter = f }.height(40.dp),
                        color = if (isSel) Primary else White,
                        shape = RoundedCornerShape(20.dp),
                        border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                    ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 16.dp)) {
                            Text(f, color = if (isSel) White else TextSecondary, fontSize = 13.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // ── Table Header ─────────────────────────────────────────────────────
        Surface(color = Primary.copy(alpha = 0.06f), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                Text("Receipt #",   modifier = Modifier.weight(1.5f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Date & Time", modifier = Modifier.weight(1.5f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Subtotal",    modifier = Modifier.weight(1f),   fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("VAT",         modifier = Modifier.weight(0.8f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Total",       modifier = Modifier.weight(1f),   fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Method",      modifier = Modifier.weight(1.2f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Items",       modifier = Modifier.weight(0.6f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Actions",     modifier = Modifier.weight(1.2f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
            }
        }

            // ── Content ───────────────────────────────────────────────────────────
        }

        if (loading) {
            item {
                Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) { CircularProgressIndicator(color = Primary) }
            }
        } else if (filtered.isEmpty()) {
            item {
                Box(Modifier.fillMaxWidth().height(300.dp), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.ReceiptLong, null, tint = TextMuted, modifier = Modifier.size(56.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No transactions found", color = TextMuted, fontSize = 16.sp)
                        if (searchQuery.isNotEmpty() || selectedFilter != "All") {
                            Spacer(Modifier.height(6.dp))
                            Text("Try clearing the search or filter", color = TextMuted, fontSize = 13.sp)
                        }
                    }
                }
            }
        } else {
            items(filtered, key = { it.id }) { txn ->
                val isExpanded = expandedId == txn.id
                Surface(
                        color = White,
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isExpanded) Primary.copy(alpha = 0.4f) else Border),
                        modifier = Modifier.fillMaxWidth().clickable { expandedId = if (isExpanded) null else txn.id }
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Receipt + Cashier
                                Column(modifier = Modifier.weight(1.5f)) {
                                    Text(txn.receiptNumber, fontWeight = FontWeight.Bold, color = Primary, fontSize = 13.sp)
                                    Text(txn.cashierName, color = TextMuted, fontSize = 11.sp)
                                }
                                // Date & Time
                                Column(modifier = Modifier.weight(1.5f)) {
                                    Text(txn.date, color = TextSecondary, fontSize = 13.sp)
                                    Text(txn.time, color = TextMuted, fontSize = 11.sp)
                                }
                                // Subtotal
                                Text(
                                    txn.subtotal?.let { "₱${String.format("%.2f", it)}" } ?: "—",
                                    modifier = Modifier.weight(1f),
                                    color = TextSecondary, fontSize = 13.sp
                                )
                                // VAT
                                Text(
                                    txn.vat?.let { "₱${String.format("%.2f", it)}" } ?: "—",
                                    modifier = Modifier.weight(0.8f),
                                    color = TextSecondary, fontSize = 13.sp
                                )
                                // Total
                                Text(
                                    "₱${String.format("%.2f", txn.totalAmount)}",
                                    modifier = Modifier.weight(1f),
                                    color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp
                                )
                                // Payment badge
                                Box(modifier = Modifier.weight(1.2f)) {
                                    val (pmColor, pmBg) = when {
                                        txn.paymentMethod.contains("Cash", true) && !txn.paymentMethod.contains("Split") -> Pair(Color(0xFF10B981), Color(0xFFD1FAE5))
                                        txn.paymentMethod.contains("Card", true) -> Pair(Info, Color(0xFFDBEAFE))
                                        txn.paymentMethod.contains("GCash", true) -> Pair(Color(0xFF0066CC), Color(0xFFDCEEFF))
                                        else -> Pair(Warning, Color(0xFFFEF3C7))
                                    }
                                    Surface(color = pmBg, shape = RoundedCornerShape(6.dp)) {
                                        Text(txn.paymentMethod.take(16), color = pmColor, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                    }
                                }
                                // Items
                                Text("${txn.itemsCount} items", modifier = Modifier.weight(0.6f), color = TextMuted, fontSize = 12.sp)
                                // Actions
                                Row(modifier = Modifier.weight(1.2f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    val context = androidx.compose.ui.platform.LocalContext.current
                                    Surface(
                                        color = Primary.copy(alpha = 0.08f), shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.clickable {
                                            coroutineScope.launch {
                                                com.pharmacare.pos.util.PrintManager.printReceipt(
                                                    context = context,
                                                    receiptNumber = txn.receiptNumber,
                                                    items = txn.items.map { item ->
                                                        mapOf(
                                                            "name" to (item["name"]?.toString() ?: "Item"),
                                                            "quantity" to (item["qty"] ?: item["quantity"] ?: 1),
                                                            "unit_price" to (item["price"] ?: item["unit_price"] ?: 0.0)
                                                        )
                                                    },
                                                    total = txn.totalAmount,
                                                    paymentMethod = txn.paymentMethod + " (Reprint)",
                                                    subtotal = txn.subtotal,
                                                    vat = txn.vat,
                                                    discountAmount = txn.discountAmount ?: 0.0,
                                                    discountLabel = txn.discountLabel
                                                )
                                            }
                                        }
                                    ) {
                                        Row(modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Print, null, tint = Primary, modifier = Modifier.size(13.dp))
                                            Spacer(Modifier.width(3.dp))
                                            Text("Print", color = Primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Surface(
                                        color = Error.copy(alpha = 0.08f), shape = RoundedCornerShape(6.dp),
                                        modifier = Modifier.clickable { refundTxn = txn }
                                    ) {
                                        Row(modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.AssignmentReturn, null, tint = Error, modifier = Modifier.size(13.dp))
                                            Spacer(Modifier.width(3.dp))
                                            Text("Refund", color = Error, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }

                            // Expanded items detail
                            AnimatedVisibility(visible = isExpanded, enter = expandVertically(), exit = shrinkVertically()) {
                                Column(
                                    modifier = Modifier.fillMaxWidth().background(SurfaceLight)
                                        .padding(horizontal = 20.dp, vertical = 12.dp)
                                ) {
                                    Text("Sold Items", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                                    Spacer(Modifier.height(8.dp))
                                    txn.items.forEach { item ->
                                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(modifier = Modifier.size(6.dp).background(Primary, RoundedCornerShape(3.dp)))
                                            Spacer(Modifier.width(8.dp))
                                            // Backend item keys: name, qty, price, category
                                            val qty = ((item["qty"] as? Double)?.toInt())
                                                ?: ((item["quantity"] as? Double)?.toInt()) ?: 1
                                            val price = (item["price"] as? Double)
                                                ?: (item["unit_price"] as? Double) ?: 0.0
                                            Text(
                                                "${item["name"]} × $qty",
                                                color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(1f)
                                            )
                                            Text(
                                                "₱${String.format("%.2f", price * qty)}",
                                                color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                    // Totals breakdown
                                    val isSeniorOrPwd = txn.discountLabel?.contains("SENIOR", ignoreCase = true) == true || 
                                                       txn.discountLabel?.contains("PWD", ignoreCase = true) == true
                                    
                                    if (isSeniorOrPwd && (txn.discountAmount ?: 0.0) > 0) {
                                        val gross = (txn.subtotal ?: 0.0) + (txn.vat ?: 0.0)
                                        val vatRelief = txn.vat ?: (gross - (gross / 1.12))
                                        val vatExempt = gross - vatRelief
                                        val seniorDiscount = (txn.discountAmount ?: 0.0) - vatRelief
                                        
                                        listOf(
                                            Triple("Gross Amount", "₱${String.format("%.2f", gross)}", TextSecondary),
                                            Triple("Less VAT (12%)", "-₱${String.format("%.2f", vatRelief)}", TextMuted),
                                            Triple("VAT-Exempt Sale", "₱${String.format("%.2f", vatExempt)}", TextSecondary),
                                            Triple("${txn.discountLabel ?: "Discount"}", "-₱${String.format("%.2f", seniorDiscount)}", Success),
                                            Triple("TOTAL DISCOUNT", "-₱${String.format("%.2f", txn.discountAmount ?: 0.0)}", Success)
                                        ).forEach { (label, value, color) ->
                                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 1.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text(label, color = color, fontSize = 12.sp)
                                                Text(value, color = color, fontSize = 12.sp, fontWeight = if (label.contains("TOTAL")) FontWeight.Bold else FontWeight.Normal)
                                            }
                                        }
                                    } else {
                                        // Standard Breakdown
                                        txn.subtotal?.let { sub ->
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("Subtotal", color = TextSecondary, fontSize = 13.sp)
                                                Text("₱${String.format("%.2f", sub)}", color = TextSecondary, fontSize = 13.sp)
                                            }
                                        }
                                        txn.vat?.let { vat ->
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text("VAT (12%)", color = TextMuted, fontSize = 13.sp)
                                                Text("₱${String.format("%.2f", vat)}", color = TextMuted, fontSize = 13.sp)
                                            }
                                        }
                                        if (txn.discountAmount != null && txn.discountAmount > 0) {
                                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                                Text(txn.discountLabel ?: "Discount", color = Success, fontSize = 13.sp)
                                                Text("-₱${String.format("%.2f", txn.discountAmount)}", color = Success, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                            }
                                        }
                                    }
                                    
                                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = Border)
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(if (isSeniorOrPwd) "NET PAID" else "TOTAL PAID", fontWeight = FontWeight.ExtraBold, color = TextPrimary, fontSize = 14.sp)
                                        Text("₱${String.format("%.2f", txn.totalAmount)}", fontWeight = FontWeight.ExtraBold, color = Primary, fontSize = 15.sp)
                                    }
                                } // closes Column 338
                            } // closes AnimatedVisibility 337
                        } // closes Column 269
                    } // closes Surface 263
                    Spacer(Modifier.height(4.dp))
                } // closes items 261
            } // closes else 260
        } // closes LazyColumn 136

    // ── Refund Dialog ──────────────────────────────────────────────────────────
    refundTxn?.let { txn ->
        PartialRefundDialog(
            transactionId = txn.receiptNumber,
            items = txn.items,
            totalAmount = txn.totalAmount,
            onDismiss = { refundTxn = null },
            onConfirm = { selectedItems, refundAmount ->
                handleRefund(txn, selectedItems, refundAmount)
            }
        )
    }
}

@Composable
private fun HistoryStatCard(label: String, value: String, icon: ImageVector, color: Color, modifier: Modifier) {
    Surface(color = White, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = modifier) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(modifier = Modifier.size(40.dp).background(color.copy(alpha = 0.1f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(22.dp))
            }
            Column {
                Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextPrimary)
                Text(label, color = TextMuted, fontSize = 11.sp)
            }
        }
    }
}

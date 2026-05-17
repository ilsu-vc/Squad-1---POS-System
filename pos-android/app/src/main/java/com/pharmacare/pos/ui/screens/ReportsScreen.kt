package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.ui.components.*
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsAndAnalysisScreen() {
    var activeTab by remember { mutableStateOf("Daily Summary") }
    val tabs = listOf("Daily Summary", "Hourly Sales", "Discount Usage", "Product Performance", "Payment Methods", "Sales by Category")

    var transactions by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    fun loadData() {
        loading = true
        errorMsg = null
        coroutineScope.launch {
            try {
                delay(500)
                val resp = ApiClient.transactionApi.getTransactionHistory()
                if (resp.isSuccessful) {
                    val raw = resp.body()?.get("transactions")
                    if (raw is List<*>) {
                        transactions = raw.mapNotNull { it as? Map<String, Any> }
                    }
                } else {
                    errorMsg = "Failed to load data (${resp.code()})"
                }
            } catch (e: Exception) {
                errorMsg = "Error loading data: ${e.message}"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { loadData() }

    Column(modifier = Modifier.fillMaxSize().background(SurfaceLight)) {
        // Tabs
        Surface(color = White, border = androidx.compose.foundation.BorderStroke(1.dp, Border)) {
            Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Reports & Analysis", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                        Text("Track performance and business trends", color = TextMuted, fontSize = 13.sp)
                    }
                    Button(
                        onClick = { loadData() },
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Refresh")
                    }
                }
                Spacer(Modifier.height(14.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tabs) { tab ->
                        val isSel = activeTab == tab
                        Surface(
                            modifier = Modifier.clickable { activeTab = tab }.height(38.dp),
                            color = if (isSel) Primary else SurfaceLight,
                            shape = RoundedCornerShape(20.dp),
                            border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                        ) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 18.dp)) {
                                Text(tab, color = if (isSel) White else TextSecondary, fontSize = 13.sp, fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal)
                            }
                        }
                    }
                }
            }
        }

        Box(modifier = Modifier.fillMaxSize().padding(24.dp)) {
            if (loading) {
                Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Primary) }
            } else if (errorMsg != null) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Error, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text(errorMsg!!, color = Error)
                    }
                }
            } else {
                when (activeTab) {
                    "Daily Summary" -> DailySummaryTab(transactions)
                    "Hourly Sales" -> HourlySalesTab(transactions)
                    "Discount Usage" -> DiscountUsageTab(transactions)
                    "Product Performance" -> ProductPerformanceTab(transactions)
                    "Payment Methods" -> PaymentMethodsTab(transactions)
                    "Sales by Category" -> SalesByCategoryTab(transactions)
                }
            }
        }
    }
}

@Composable
private fun StatCard(title: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(color = White, shape = RoundedCornerShape(14.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Text(title, color = TextMuted, fontSize = 12.sp)
        }
    }
}

@Composable
private fun DailySummaryTab(txns: List<Map<String, Any>>) {
    val txnCount = txns.size
    val totalSales = txns.sumOf { (it["rawAmount"] as? Double) ?: 0.0 }
    val avgTicket = if (txnCount > 0) totalSales / txnCount else 0.0
    val itemsSold = txns.sumOf { ((it["itemsCount"] as? Double)?.toInt()) ?: 0 }

    var cashSales = 0.0
    var cardSales = 0.0
    var gcashSales = 0.0

    txns.forEach { t ->
        val amt = (t["rawAmount"] as? Double) ?: 0.0
        val method = t["method"]?.toString()?.lowercase() ?: "cash"
        when (method) {
            "cash" -> cashSales += amt
            "card" -> cardSales += amt
            "gcash" -> gcashSales += amt
        }
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                listOf(
                    Triple("Total Sales", "₱${String.format("%,.2f", totalSales)}", Primary),
                    Triple("Transactions", txnCount.toString(), Color(0xFF8B5CF6)),
                    Triple("Avg. Ticket", "₱${String.format("%,.2f", avgTicket)}", Color(0xFFF59E0B)),
                    Triple("Items Sold", itemsSold.toString(), Color(0xFF10B981))
                ).forEach { (title, value, color) ->
                    StatCard(title, value, color, modifier = Modifier.weight(1f))
                }
            }
        }
        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Sales Summary Breakdown", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                    Spacer(Modifier.height(16.dp))
                    listOf(
                        Triple("Cash Sales", "₱${String.format("%,.2f", cashSales)}", Color(0xFF10B981)),
                        Triple("Card Sales", "₱${String.format("%,.2f", cardSales)}", Info),
                        Triple("GCash Sales", "₱${String.format("%,.2f", gcashSales)}", Color(0xFF0066CC)),
                        Triple("Total Revenue", "₱${String.format("%,.2f", totalSales)}", Primary)
                    ).forEach { (label, value, color) ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(label, color = TextSecondary)
                            Text(value, color = color, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HourlySalesTab(txns: List<Map<String, Any>>) {
    val hourData = mutableMapOf<String, Pair<Double, Int>>()
    
    // Initialize all 24 hours to ensure a full chart
    val hours = listOf("12AM", "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM")
    hours.forEach { hourData[it] = Pair(0.0, 0) }

    txns.forEach { t ->
        val hour = t["hour"]?.toString() ?: "12AM"
        val current = hourData[hour] ?: Pair(0.0, 0)
        hourData[hour] = Pair(current.first + ((t["rawAmount"] as? Double) ?: 0.0), current.second + 1)
    }
    
    val chartPoints = hours.map { h ->
        val stats = hourData[h]!!
        ChartPoint(h, stats.first.toFloat(), stats.second)
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("Hourly Sales Performance", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                    Text("Revenue (Bars) vs Transaction Count (Line)", color = TextMuted, fontSize = 13.sp)
                    Spacer(Modifier.height(24.dp))
                    ComposedChart(data = chartPoints, height = 240f)
                }
            }
        }
        
        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Hourly Breakdown", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                    Spacer(Modifier.height(16.dp))
                    hourData.entries.filter { it.value.second > 0 }.sortedBy { hours.indexOf(it.key) }.forEach { (hour, stats) ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(hour, color = TextPrimary, fontWeight = FontWeight.Medium)
                            Row {
                                Text("${stats.second} txns", color = TextMuted, fontSize = 13.sp)
                                Spacer(Modifier.width(12.dp))
                                Text("₱${String.format("%,.2f", stats.first)}", color = Primary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DiscountUsageTab(txns: List<Map<String, Any>>) {
    val discountsMap = mutableMapOf<String, Double>()
    txns.forEach { t ->
        val subtotal = (t["subtotal"] as? Double) ?: 0.0
        val rawAmount = (t["rawAmount"] as? Double) ?: 0.0
        if (subtotal > rawAmount) {
            val discountAmt = subtotal - rawAmount
            val reason = t["discountType"]?.toString()?.ifEmpty { "General Discount" } ?: "General Discount"
            discountsMap[reason] = (discountsMap[reason] ?: 0.0) + discountAmt
        }
    }

    val colors = listOf(Primary, Color(0xFF8B5CF6), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF3B82F6))
    val chartData = discountsMap.entries.sortedByDescending { it.value }.take(5).mapIndexed { i, (reason, amt) ->
        Triple(reason, amt.toFloat(), colors.getOrElse(i) { Color.Gray })
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (discountsMap.isNotEmpty()) {
            item {
                Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Discount Distribution", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                        Text("Breakdown by discount reason", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(24.dp))
                        PieChart(data = chartData, size = 160f)
                    }
                }
            }
        }

        item {
            Surface(color = Primary.copy(alpha = 0.06f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(16.dp)) {
                    listOf("Discount Reason", "Total Savings").forEach { h ->
                        Text(h, modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                    }
                }
            }
        }
        
        if (discountsMap.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                    Text("No discounts applied today", color = TextMuted)
                }
            }
        } else {
            items(discountsMap.entries.sortedByDescending { it.value }.toList()) { (reason, amount) ->
                Surface(color = White, shape = RoundedCornerShape(8.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Row(modifier = Modifier.padding(16.dp)) {
                        Text(reason, modifier = Modifier.weight(1f), color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("₱${String.format("%,.2f", amount)}", modifier = Modifier.weight(1f), color = TextSecondary, fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductPerformanceTab(txns: List<Map<String, Any>>) {
    var sortBy by remember { mutableStateOf("Units") } // "Units" or "Revenue"
    
    val productSales = mutableMapOf<String, Triple<String, Int, Double>>() // Name -> (Category, Qty, Revenue)
    txns.forEach { t ->
        @Suppress("UNCHECKED_CAST")
        val items = t["items"] as? List<Map<String, Any>> ?: emptyList()
        items.forEach { item ->
            val name = item["name"]?.toString() ?: "Unknown"
            val cat = item["category"]?.toString() ?: "Uncategorized"
            val qty = ((item["qty"] as? Double)?.toInt()) ?: ((item["quantity"] as? Double)?.toInt()) ?: 1
            val price = (item["price"] as? Double) ?: 0.0
            val rev = qty * price
            
            val current = productSales[name] ?: Triple(cat, 0, 0.0)
            productSales[name] = Triple(cat, current.second + qty, current.third + rev)
        }
    }

    val sortedProducts = if (sortBy == "Units") {
        productSales.entries.sortedByDescending { it.value.second }
    } else {
        productSales.entries.sortedByDescending { it.value.third }
    }
    
    val maxVal = if (sortBy == "Units") {
        sortedProducts.maxOfOrNull { it.value.second }?.toFloat() ?: 1f
    } else {
        sortedProducts.maxOfOrNull { it.value.third }?.toFloat() ?: 1f
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Units", "Revenue").forEach { mode ->
                    val isSel = sortBy == mode
                    Surface(
                        modifier = Modifier.weight(1f).clickable { sortBy = mode },
                        color = if (isSel) Primary else White,
                        shape = RoundedCornerShape(8.dp),
                        border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                    ) {
                        Box(modifier = Modifier.padding(vertical = 10.dp), contentAlignment = Alignment.Center) {
                            Text(mode, color = if (isSel) White else TextSecondary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        item {
            Surface(color = Primary.copy(alpha = 0.06f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(16.dp)) {
                    Text("Product", modifier = Modifier.weight(1.5f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                    Text(if (sortBy == "Units") "Units" else "Revenue", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp, textAlign = androidx.compose.ui.text.style.TextAlign.End)
                    Text("Perf", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp, textAlign = androidx.compose.ui.text.style.TextAlign.End)
                }
            }
        }

        if (sortedProducts.isEmpty()) {
            item {
                Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                    Text("No products sold today", color = TextMuted)
                }
            }
        } else {
            items(sortedProducts) { (name, stats) ->
                val (cat, qty, rev) = stats
                val currentVal = if (sortBy == "Units") qty.toFloat() else rev.toFloat()
                val pct = (currentVal / maxVal)
                
                Surface(color = White, shape = RoundedCornerShape(8.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1.5f)) {
                                Text(name, color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(cat, color = TextMuted, fontSize = 11.sp)
                            }
                            Text(
                                text = if (sortBy == "Units") qty.toString() else "₱${String.format("%,.0f", rev)}",
                                modifier = Modifier.weight(1f),
                                color = TextPrimary,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 14.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.End
                            )
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.CenterEnd) {
                                CircularProgressIndicator(
                                    progress = { pct },
                                    modifier = Modifier.size(24.dp),
                                    color = if (pct > 0.7f) Color(0xFF10B981) else if (pct > 0.3f) Warning else Primary,
                                    strokeWidth = 3.dp,
                                    trackColor = Border
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodsTab(txns: List<Map<String, Any>>) {
    val methodStats = mutableMapOf<String, Double>()
    val totalSales = txns.sumOf { (it["rawAmount"] as? Double) ?: 0.0 }

    txns.forEach { t ->
        val amt = (t["rawAmount"] as? Double) ?: 0.0
        val method = t["method"]?.toString()?.replaceFirstChar { it.uppercase() } ?: "Cash"
        methodStats[method] = (methodStats[method] ?: 0.0) + amt
    }

    val colorMap = mapOf("Cash" to Color(0xFF10B981), "Card" to Info, "GCash" to Color(0xFF0066CC), "Split" to Color(0xFFF59E0B))
    val chartData = methodStats.entries.sortedByDescending { it.value }.map { (m, amt) ->
        Triple(m, amt.toFloat(), colorMap[m] ?: Primary)
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (chartData.isNotEmpty()) {
            item {
                Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Payment Distribution", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                        Text("Revenue breakdown by method", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(24.dp))
                        PieChart(data = chartData, size = 160f)
                    }
                }
            }
        }

        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Payment Details", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                    Spacer(Modifier.height(16.dp))
                    methodStats.entries.sortedByDescending { it.value }.forEach { (method, amount) ->
                        val pct = if (totalSales > 0) (amount / totalSales * 100).toInt() else 0
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(method, color = TextPrimary, fontWeight = FontWeight.Medium)
                            Row {
                                Text("$pct%", color = TextMuted, fontSize = 13.sp)
                                Spacer(Modifier.width(12.dp))
                                Text("₱${String.format("%,.2f", amount)}", color = colorMap[method] ?: Primary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SalesByCategoryTab(txns: List<Map<String, Any>>) {
    val catStats = mutableMapOf<String, Double>()
    val totalSales = txns.sumOf { (it["rawAmount"] as? Double) ?: 0.0 }

    txns.forEach { t ->
        @Suppress("UNCHECKED_CAST")
        val items = t["items"] as? List<Map<String, Any>> ?: emptyList()
        items.forEach { item ->
            val cat = item["category"]?.toString() ?: "Uncategorized"
            val qty = ((item["qty"] as? Double)?.toInt()) ?: ((item["quantity"] as? Double)?.toInt()) ?: 1
            val price = (item["price"] as? Double) ?: 0.0
            catStats[cat] = (catStats[cat] ?: 0.0) + (qty * price)
        }
    }

    val colors = listOf(Primary, Color(0xFF8B5CF6), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF3B82F6))
    val chartData = catStats.entries.sortedByDescending { it.value }.take(6).mapIndexed { i, (cat, amt) ->
        Triple(cat, amt.toFloat(), colors.getOrElse(i) { Color.Gray })
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (chartData.isNotEmpty()) {
            item {
                Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Category Performance", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                        Text("Revenue contribution by department", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(24.dp))
                        PieChart(data = chartData, size = 180f)
                    }
                }
            }
        }

        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("Department Breakdown", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                    Spacer(Modifier.height(16.dp))
                    catStats.entries.sortedByDescending { it.value }.forEach { (cat, amount) ->
                        val pct = if (totalSales > 0) (amount / totalSales * 100).toInt() else 0
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(cat, color = TextPrimary, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            Row {
                                Text("$pct%", color = TextMuted, fontSize = 13.sp)
                                Spacer(Modifier.width(12.dp))
                                Text("₱${String.format("%,.2f", amount)}", color = Primary, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}


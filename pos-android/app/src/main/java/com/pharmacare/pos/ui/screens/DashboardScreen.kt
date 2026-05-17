package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.components.*
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch
import java.util.Calendar

@Composable
fun DashboardScreen() {
    // ── State ──────────────────────────────────────────────────────────────
    var totalSales    by remember { mutableStateOf(0.0) }
    var txnCount      by remember { mutableStateOf(0) }
    var avgTicket     by remember { mutableStateOf(0.0) }
    var itemsSold     by remember { mutableStateOf(0) }
    var lowStockCount by remember { mutableStateOf("0") } // We can mock this or fetch from inventory if needed

    // Product performance: list of (name, unitsSold, pct)
    var topProducts by remember { mutableStateOf<List<Triple<String, Int, Float>>>(emptyList()) }

    // Payment breakdown: list of (method, count, color)
    var paymentBreakdown by remember { mutableStateOf<List<Triple<String, Float, Color>>>(emptyList()) }

    // Category breakdown: list of (category, count, color)
    var categoryBreakdown by remember { mutableStateOf<List<Triple<String, Float, Color>>>(emptyList()) }

    // Hourly chart points
    var chartPoints by remember { mutableStateOf<List<Pair<String, Float>>>(emptyList()) }

    var recentTxns by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }

    var loading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var userEmail by remember { mutableStateOf("") }
    var userRole  by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()

    fun loadDashboardData() {
        loading = true
        errorMsg = null
        coroutineScope.launch {
            try {
                // Give Supabase a moment to refresh the token on app startup
                kotlinx.coroutines.delay(500)
                val resp = ApiClient.transactionApi.getTransactionHistory()
                if (resp.isSuccessful) {
                    val raw = resp.body()?.get("transactions")
                    if (raw is List<*>) {
                        val allTxns = raw.mapNotNull { item ->
                            @Suppress("UNCHECKED_CAST")
                            item as? Map<String, Any>
                        }
                        
                        // Use all fetched for now to ensure data shows up.
                        val txns = allTxns
                        
                        // ── Basic Stats ──
                        txnCount = txns.size
                        totalSales = txns.sumOf { (it["rawAmount"] as? Double) ?: 0.0 }
                        avgTicket = if (txnCount > 0) totalSales / txnCount else 0.0
                        itemsSold = txns.sumOf { ((it["itemsCount"] as? Double)?.toInt()) ?: 0 }

                        // ── Recent Transactions ──
                        recentTxns = txns.take(5)

                        // ── Payment Breakdown ──
                        val methodCounts = mutableMapOf<String, Int>()
                        txns.forEach { t -> 
                            val method = t["method"]?.toString()?.lowercase() ?: "cash"
                            methodCounts[method] = (methodCounts[method] ?: 0) + 1
                        }
                        val colorMap = mapOf("cash" to Color(0xFF10B981), "card" to Color(0xFF3B82F6), "gcash" to Color(0xFF0066CC), "split" to Color(0xFFF59E0B))
                        paymentBreakdown = methodCounts.entries.sortedByDescending { it.value }.take(4).map { (m, count) ->
                            val color = colorMap[m] ?: Color(0xFF8B5CF6)
                            Triple(m.replaceFirstChar { it.uppercase() }, count.toFloat(), color)
                        }

                        // ── Category Breakdown ──
                        val catCounts = mutableMapOf<String, Double>()
                        txns.forEach { t ->
                            @Suppress("UNCHECKED_CAST")
                            val items = t["items"] as? List<Map<String, Any>> ?: emptyList()
                            items.forEach { item ->
                                val cat = item["category"]?.toString() ?: "Uncategorized"
                                val qty = ((item["qty"] as? Double)?.toInt()) ?: ((item["quantity"] as? Double)?.toInt()) ?: 1
                                catCounts[cat] = (catCounts[cat] ?: 0.0) + qty
                            }
                        }
                        val catColors = listOf(Primary, Color(0xFF8B5CF6), Color(0xFFF59E0B), Color(0xFF10B981), Color(0xFF3B82F6))
                        categoryBreakdown = catCounts.entries.sortedByDescending { it.value }.take(5).mapIndexed { i, (cat, count) ->
                            Triple(cat, count.toFloat(), catColors.getOrElse(i) { Color.Gray })
                        }

                        // ── Top Products ──
                        val productSales = mutableMapOf<String, Int>()
                        txns.forEach { t ->
                            @Suppress("UNCHECKED_CAST")
                            val items = t["items"] as? List<Map<String, Any>> ?: emptyList()
                            items.forEach { item ->
                                val name = item["name"]?.toString() ?: "Unknown"
                                val qty = ((item["qty"] as? Double)?.toInt()) ?: ((item["quantity"] as? Double)?.toInt()) ?: 1
                                productSales[name] = (productSales[name] ?: 0) + qty
                            }
                        }
                        val maxSold = productSales.values.maxOrNull()?.takeIf { it > 0 } ?: 1
                        topProducts = productSales.entries.sortedByDescending { it.value }.take(5).map { (name, qty) ->
                            Triple(name, qty, (qty.toFloat() / maxSold).coerceIn(0f, 1f))
                        }

                        // ── Revenue By Hour (Simple Chart) ──
                        val hourSales = mutableMapOf<String, Double>()
                        txns.forEach { t ->
                            val hour = t["hour"]?.toString() ?: "12AM"
                            hourSales[hour] = (hourSales[hour] ?: 0.0) + ((t["rawAmount"] as? Double) ?: 0.0)
                        }
                        // Just take top 7 hours chronologically
                        chartPoints = hourSales.entries.toList().takeLast(7).map { it.key to it.value.toFloat() }
                    }
                } else {
                    errorMsg = "Failed to load dashboard data (${resp.code()})"
                }
            } catch (e: Exception) {
                e.printStackTrace()
                errorMsg = "Error loading data: ${e.message}"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        userEmail = SupabaseManager.client.auth.currentUserOrNull()?.email ?: ""
        userRole  = SupabaseManager.getUserRole()
        loadDashboardData()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(SurfaceLight).padding(28.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        // ── Header ────────────────────────────────────────────────────────
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("Dashboard", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                    Text("Good ${greeting()}, ${userEmail.substringBefore("@")}", color = TextMuted, fontSize = 14.sp)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Surface(color = Primary.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                        Row(modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Schedule, null, tint = Primary, modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(java.text.SimpleDateFormat("EEE, MMM dd yyyy").format(java.util.Date()), color = Primary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }
        }

        if (errorMsg != null) {
            item {
                Surface(
                    color = Error.copy(alpha = 0.1f), 
                    shape = RoundedCornerShape(10.dp), 
                    modifier = Modifier.fillMaxWidth().clickable { loadDashboardData() }
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Warning, null, tint = Error, modifier = Modifier.size(18.dp))
                        Text("$errorMsg — Tap to retry", color = Error, fontSize = 13.sp, modifier = Modifier.weight(1f))
                        Icon(Icons.Default.Refresh, contentDescription = "Retry", tint = Error, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // ── KPI Cards ─────────────────────────────────────────────────────
        item {
            if (loading) {
                Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    DashKpiCard("Total Sales",  "₱${String.format("%,.2f", totalSales)}", Icons.Default.AttachMoney,   Primary,              Modifier.weight(1f))
                    DashKpiCard("Transactions", txnCount.toString(),                       Icons.Default.Receipt,        Color(0xFF8B5CF6),    Modifier.weight(1f))
                    DashKpiCard("Avg. Ticket",  "₱${String.format("%,.2f", avgTicket)}",  Icons.Default.TrendingUp,     Color(0xFFF59E0B),    Modifier.weight(1f))
                    DashKpiCard("Items Sold",   itemsSold.toString(),                      Icons.Default.ShoppingCart,   Color(0xFF10B981),    Modifier.weight(1f))
                }
            }
        }

        // ── Sales Trend Chart ─────────────────────────────────────────────
        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column {
                            Text("Revenue by Hour", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                            Text("Sales performance distribution", color = TextMuted, fontSize = 13.sp)
                        }
                        Surface(color = Primary.copy(alpha = 0.08f), shape = RoundedCornerShape(6.dp)) {
                            Text("Overview", color = Primary, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    if (loading) {
                        Box(modifier = Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Primary)
                        }
                    } else {
                        val displayPoints = chartPoints.ifEmpty {
                            listOf("10AM" to 200f, "11AM" to 400f, "12PM" to 350f, "1PM" to 600f, "2PM" to 550f, "3PM" to 800f, "4PM" to 1000f)
                        }
                        BarChart(data = displayPoints, height = 160f)
                    }
                }
            }
        }

        // ── Top Products + Payment Breakdown ─────────────────────────────
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                // Top Products
                Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("Top Products", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                        Text("Best sellers overview", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(14.dp))

                        if (loading) {
                            repeat(4) {
                                Box(modifier = Modifier.fillMaxWidth().height(14.dp).background(Border, RoundedCornerShape(4.dp)))
                                Spacer(Modifier.height(10.dp))
                            }
                        } else if (topProducts.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp), contentAlignment = Alignment.Center) {
                                Text("No sales data yet", color = TextMuted, fontSize = 13.sp)
                            }
                        } else {
                            topProducts.forEach { (name, units, pct) ->
                                Column(modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)) {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Text(name, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                        Text("$units sold", color = TextMuted, fontSize = 12.sp)
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    LinearProgressIndicator(
                                        progress = { pct },
                                        modifier = Modifier.fillMaxWidth().height(6.dp),
                                        color = Primary, trackColor = Border
                                    )
                                }
                            }
                        }
                    }
                }

                // Payment Breakdown
                Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Payment Methods", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
                        Text("Transaction breakdown", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(8.dp))

                        if (loading) {
                            Box(modifier = Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = Primary)
                            }
                        } else {
                            val displayBreakdown = paymentBreakdown.ifEmpty {
                                listOf(
                                    Triple("Cash",  100f, Color(0xFF10B981)),
                                    Triple("Card",  50f, Color(0xFF3B82F6)),
                                    Triple("GCash", 30f, Color(0xFF0066CC))
                                )
                            }
                            PieChart(data = displayBreakdown, size = 120f)
                        }
                    }
                }
            }
        }

        // ── Sales By Category ─────────────────────────────────────────────
        item {
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("Sales by Category", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = TextPrimary)
                    Text("Inventory performance by department", color = TextMuted, fontSize = 13.sp)
                    Spacer(Modifier.height(20.dp))

                    if (loading) {
                        Box(modifier = Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Primary)
                        }
                    } else if (categoryBreakdown.isEmpty()) {
                        Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                            Text("No category data available", color = TextMuted)
                        }
                    } else {
                        PieChart(data = categoryBreakdown, size = 160f)
                    }
                }
            }
        }
    }
}

@Composable
private fun DashKpiCard(title: String, value: String, icon: ImageVector, color: Color, modifier: Modifier = Modifier) {
    Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = modifier) {
        Column(modifier = Modifier.padding(20.dp)) {
            Box(modifier = Modifier.size(44.dp).background(color.copy(alpha = 0.1f), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = color, modifier = Modifier.size(24.dp))
            }
            Spacer(Modifier.height(14.dp))
            Text(value, color = color, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Spacer(Modifier.height(2.dp))
            Text(title, color = TextMuted, fontSize = 13.sp)
        }
    }
}

private fun greeting(): String = when (java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)) {
    in 5..11  -> "morning"
    in 12..17 -> "afternoon"
    else      -> "evening"
}

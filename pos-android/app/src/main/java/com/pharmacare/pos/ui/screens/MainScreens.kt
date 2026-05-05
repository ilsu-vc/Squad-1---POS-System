package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch

@Composable
fun CustomersScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(24.dp)
    ) {
        Text("Customers", color = TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(24.dp))
        
        Surface(
            color = Surface,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
            modifier = Modifier.fillMaxWidth().weight(1f)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Filled.Person, contentDescription = null, tint = TextMuted, modifier = Modifier.size(64.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Customer management coming soon.", color = TextMuted, fontSize = 18.sp)
                }
            }
        }
    }
}

@Composable
fun ShiftScreen() {
    var isShiftActive by remember { mutableStateOf(false) }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(24.dp)
    ) {
        Text("Shift Management", color = TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(24.dp))
        
        Surface(
            color = Surface,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    text = if (isShiftActive) "Shift is currently ACTIVE" else "No active shift",
                    color = if (isShiftActive) Success else TextSecondary,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = { isShiftActive = !isShiftActive },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isShiftActive) Error else Primary
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = if (isShiftActive) "End Shift" else "Start Shift",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = White
                    )
                }
            }
        }
    }
}

@Composable
fun StatCard(icon: ImageVector, label: String, value: String, color: androidx.compose.ui.graphics.Color) {
    Surface(
        color = Surface,
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Border),
        modifier = Modifier.height(140.dp)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(color.copy(alpha = 0.15f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(28.dp))
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(value, color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(label, color = TextMuted, fontSize = 14.sp)
        }
    }
}

@Composable
fun ReportsScreen() {
    var loading by remember { mutableStateOf(true) }
    var summary by remember { mutableStateOf<Map<String, Any>>(emptyMap()) }
    val coroutineScope = rememberCoroutineScope()

    fun loadData() {
        loading = true
        coroutineScope.launch {
            try {
                val response = ApiClient.reportingApi.getDailySummary()
                if (response.isSuccessful) {
                    summary = response.body() ?: emptyMap()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { loadData() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(24.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Reports", color = TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
            IconButton(onClick = { loadData() }) {
                Icon(Icons.Filled.Refresh, contentDescription = "Refresh", tint = Primary)
            }
        }
        
        Text(
            text = "TODAY'S SUMMARY",
            color = TextSecondary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (loading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Primary)
            }
        } else {
            val totalSales = summary["totalSales"] as? Double ?: 0.0
            val transactions = summary["transactionCount"] as? Double ?: 0.0
            val avgTxn = summary["averageTransaction"] as? Double ?: 0.0
            val topProduct = summary["topProduct"] as? String ?: "N/A"

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { StatCard(Icons.Filled.AttachMoney, "Total Sales", "₱${String.format("%.2f", totalSales)}", Success) }
                item { StatCard(Icons.Filled.Receipt, "Transactions", "${transactions.toInt()}", Primary) }
                item { StatCard(Icons.Filled.TrendingUp, "Avg Transaction", "₱${String.format("%.2f", avgTxn)}", Warning) }
                item { StatCard(Icons.Filled.Star, "Top Product", topProduct, Info) }
            }
        }
    }
}

@Composable
fun ManagerScreen(onLogout: () -> Unit) {
    var userEmail by remember { mutableStateOf("Loading...") }
    
    LaunchedEffect(Unit) {
        val user = com.pharmacare.pos.data.auth.SupabaseManager.client.auth.currentUserOrNull()
        userEmail = user?.email ?: "Unknown User"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(24.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 32.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Dashboard", color = TextPrimary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Text(userEmail, color = TextMuted, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
            }
            
            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(containerColor = Error.copy(alpha = 0.15f)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Filled.ExitToApp, contentDescription = null, tint = Error)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out", color = Error, fontWeight = FontWeight.Bold)
            }
        }

        // App info
        Surface(
            color = Surface,
            shape = RoundedCornerShape(12.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("PharmaCare POS Android", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text("Version 1.0.0 • Squad-1 POS System", color = TextMuted, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                Text("Native Android Kotlin implementation", color = TextMuted, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

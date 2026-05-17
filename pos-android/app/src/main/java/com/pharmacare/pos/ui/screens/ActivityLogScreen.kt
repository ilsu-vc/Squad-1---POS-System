package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
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
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.launch

data class ActivityEntry(
    val time: String,
    val userId: String,
    val userEmail: String,
    val actionType: String,
    val actionDetails: String,
    val entityType: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityLogScreen() {
    var logs by remember { mutableStateOf<List<ActivityEntry>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()

    fun fetchLogs() {
        loading = true
        coroutineScope.launch {
            try {
                val response = ApiClient.reportingApi.getActivityLogs()
                if (response.isSuccessful) {
                    val raw = response.body()?.get("logs")
                    if (raw is List<*>) {
                        logs = raw.mapNotNull { item ->
                            @Suppress("UNCHECKED_CAST")
                            val m = item as? Map<String, Any> ?: return@mapNotNull null
                            ActivityEntry(
                                time = m["created_at"]?.toString()?.replace("T", " ")?.take(19) ?: "",
                                userId = m["user_id"]?.toString() ?: "",
                                userEmail = m["user_email"]?.toString() ?: "System",
                                actionType = m["action_type"]?.toString() ?: "",
                                actionDetails = m["action_details"]?.toString() ?: "",
                                entityType = m["entity_type"]?.toString() ?: ""
                            )
                        }
                    }
                }
            } catch (_: Exception) {
                // Set an empty list on failure and show error state
                logs = emptyList()
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { fetchLogs() }

    val filtered = logs.filter {
        it.actionDetails.contains(searchQuery, ignoreCase = true) ||
                it.userEmail.contains(searchQuery, ignoreCase = true) ||
                it.actionType.contains(searchQuery, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().background(SurfaceLight).padding(24.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("Activity Log", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Monitor system actions and user events", color = TextMuted, fontSize = 14.sp)
            }
            Button(
                onClick = { fetchLogs() },
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Refresh")
            }
        }

        Spacer(Modifier.height(20.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search logs...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = White, focusedBorderColor = Primary, unfocusedBorderColor = Border)
        )

        Spacer(Modifier.height(16.dp))

        if (loading) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Primary) }
        } else if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.HistoryEdu, contentDescription = null, tint = TextMuted, modifier = Modifier.size(56.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("No activity logs found", color = TextMuted, fontSize = 16.sp)
                }
            }
        } else {
            Surface(
                color = White,
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                modifier = Modifier.fillMaxWidth().weight(1f)
            ) {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(filtered) { log ->
                        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                // Action icon
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(actionColor(log.actionType).copy(alpha = 0.12f), RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = actionIcon(log.actionType),
                                        contentDescription = null,
                                        tint = actionColor(log.actionType),
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Surface(
                                            color = actionColor(log.actionType).copy(alpha = 0.1f),
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                log.actionType.replace("_", " "),
                                                color = actionColor(log.actionType),
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                            )
                                        }
                                        Spacer(Modifier.width(8.dp))
                                        Text(log.userEmail, color = TextMuted, fontSize = 12.sp)
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    Text(log.actionDetails, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                }
                                Text(log.time, color = TextMuted, fontSize = 12.sp)
                            }
                            HorizontalDivider(modifier = Modifier.padding(top = 14.dp), color = Border.copy(alpha = 0.5f))
                        }
                    }
                }
            }
        }
    }
}

private fun actionColor(type: String): Color = when {
    type.contains("SALE") -> Color(0xFF10B981)
    type.contains("SHIFT") -> Primary
    type.contains("INVENTORY") || type.contains("STOCK") || type.contains("PRICE") -> Color(0xFFF59E0B)
    type.contains("ROLE") || type.contains("USER") -> Color(0xFF8B5CF6)
    type.contains("TRANSFER") -> Color(0xFF3B82F6)
    type.contains("ERROR") -> Color(0xFFEF4444)
    else -> Color(0xFF64748B)
}

private fun actionIcon(type: String) = when {
    type.contains("SALE") -> Icons.Default.ShoppingCart
    type.contains("CLOCK_IN") -> Icons.Default.Login
    type.contains("CLOCK_OUT") -> Icons.Default.Logout
    type.contains("SHIFT") -> Icons.Default.Schedule
    type.contains("INVENTORY") || type.contains("STOCK") -> Icons.Default.Inventory
    type.contains("PRICE") -> Icons.Default.PriceChange
    type.contains("ROLE") || type.contains("USER") -> Icons.Default.ManageAccounts
    type.contains("TRANSFER") -> Icons.Default.SwapHoriz
    else -> Icons.Default.History
}

package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.pharmacare.pos.data.local.AppDatabase
import com.pharmacare.pos.data.local.HeldOrder
import com.pharmacare.pos.ui.theme.*
import com.pharmacare.pos.util.ActivityLogger
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HoldListScreen(navController: NavHostController) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val database = remember { AppDatabase.getDatabase(context) }
    val heldOrders by database.heldOrderDao().getAllHeld().collectAsState(initial = emptyList())
    val coroutineScope = rememberCoroutineScope()

    Column(modifier = Modifier.fillMaxSize().padding(24.dp)) {
        Text("Held Orders", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text("Resume pending orders from customers", color = TextMuted, fontSize = 14.sp)
        
        Spacer(modifier = Modifier.height(24.dp))

        if (heldOrders.isEmpty()) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text("No held orders found", color = TextMuted)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(heldOrders) { order ->
                    Surface(
                        modifier = Modifier.fillMaxWidth().clickable {
                            // Resume Order logic
                            // In a real app, we'd pass this back to the SharedViewModel
                            navController.previousBackStackEntry?.savedStateHandle?.set("resume_order_json", order.itemsJson)
                            coroutineScope.launch {
                                ActivityLogger.log(
                                    actionType = "ORDER_RESUMED",
                                    actionDetails = "Resumed held order with total ₱${String.format("%.2f", order.totalAmount)}",
                                    entityType = "held_order",
                                    entityId = order.id.toString()
                                )
                                database.heldOrderDao().delete(order)
                            }
                            navController.popBackStack()
                        },
                        color = White,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Border)
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(order.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                Text("₱${String.format("%.2f", order.totalAmount)} • ${java.text.SimpleDateFormat("MMM dd, HH:mm").format(order.timestamp)}", color = TextMuted, fontSize = 13.sp)
                            }
                            
                            IconButton(onClick = {
                                coroutineScope.launch { 
                                    ActivityLogger.log(
                                        actionType = "ORDER_DELETED",
                                        actionDetails = "Deleted held order worth ₱${String.format("%.2f", order.totalAmount)}",
                                        entityType = "held_order",
                                        entityId = order.id.toString()
                                    )
                                    database.heldOrderDao().delete(order) 
                                }
                            }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Error)
                            }
                        }
                    }
                }
            }
        }
    }
}

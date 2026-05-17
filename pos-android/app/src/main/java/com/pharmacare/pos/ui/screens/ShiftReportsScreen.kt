package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class ShiftReportItem(
    val id: String,
    val userId: String,
    val clockIn: String,
    val clockOut: String,
    val duration: String,
    val notes: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftReportsScreen() {
    var loading by remember { mutableStateOf(true) }
    var shifts by remember { mutableStateOf<List<ShiftReportItem>>(emptyList()) }
    val coroutineScope = rememberCoroutineScope()

    fun fetchShifts() {
        loading = true
        coroutineScope.launch {
            try {
                val response = ApiClient.reportingApi.getShiftRecords()
                if (response.isSuccessful) {
                    val raw = response.body()?.get("records")
                    if (raw is List<*>) {
                        shifts = raw.mapNotNull { item ->
                            @Suppress("UNCHECKED_CAST")
                            val m = item as? Map<String, Any> ?: return@mapNotNull null
                            
                            val inStr = m["clock_in_at"]?.toString()
                            val outStr = m["clock_out_at"]?.toString()
                            val hours = m["total_hours"]?.toString()?.toDoubleOrNull()
                            
                            val sdfIn = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                            sdfIn.timeZone = TimeZone.getTimeZone("UTC")
                            val sdfOut = SimpleDateFormat("MMM dd, hh:mm a", Locale.getDefault())
                            
                            val inDisplay = try {
                                sdfOut.format(sdfIn.parse(inStr?.take(19) ?: "") ?: Date())
                            } catch (_: Exception) { inStr ?: "Active" }
                            
                            val outDisplay = try {
                                sdfOut.format(sdfIn.parse(outStr?.take(19) ?: "") ?: Date())
                            } catch (_: Exception) { outStr ?: "Active" }

                            val durationDisplay = hours?.let { String.format("%.1f hrs", it) } ?: "Ongoing"

                            ShiftReportItem(
                                id = m["id"]?.toString() ?: "",
                                userId = m["user_id"]?.toString() ?: "",
                                clockIn = inDisplay,
                                clockOut = outDisplay,
                                duration = durationDisplay,
                                notes = m["handover_notes"]?.toString() ?: "None"
                            )
                        }
                    }
                }
            } catch (_: Exception) {
                shifts = emptyList()
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { fetchShifts() }

    Column(modifier = Modifier.fillMaxSize().background(SurfaceLight).padding(24.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("Shift Reports", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Review historical shift records and handovers", color = TextMuted, fontSize = 14.sp)
            }
            Button(
                onClick = { fetchShifts() },
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Refresh")
            }
        }

        Spacer(Modifier.height(24.dp))

        if (loading) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Primary) }
        } else if (shifts.isEmpty()) {
            Box(Modifier.fillMaxSize(), Alignment.Center) {
                Text("No shift records found", color = TextMuted, fontSize = 16.sp)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Surface(color = Primary.copy(alpha = 0.06f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(16.dp)) {
                            listOf("Shift ID", "User ID", "Clock In", "Clock Out", "Duration", "Notes").forEachIndexed { i, h ->
                                val weight = if (i == 5) 1.5f else 1f
                                Text(h, modifier = Modifier.weight(weight), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                            }
                        }
                    }
                }
                items(shifts) { row ->
                    Surface(color = White, shape = RoundedCornerShape(8.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(row.id.take(8), modifier = Modifier.weight(1f), color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(row.userId.take(8), modifier = Modifier.weight(1f), color = TextSecondary, fontSize = 13.sp)
                            Text(row.clockIn, modifier = Modifier.weight(1f), color = TextSecondary, fontSize = 13.sp)
                            Text(row.clockOut, modifier = Modifier.weight(1f), color = TextSecondary, fontSize = 13.sp)
                            Text(row.duration, modifier = Modifier.weight(1f), color = if (row.duration == "Ongoing") Success else TextSecondary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            Text(row.notes, modifier = Modifier.weight(1.5f), color = TextSecondary, fontSize = 13.sp, maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

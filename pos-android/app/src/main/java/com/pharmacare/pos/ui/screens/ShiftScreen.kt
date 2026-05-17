package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.Login
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.api.ClockInRequest
import com.pharmacare.pos.data.api.ClockOutRequest
import com.pharmacare.pos.data.api.ShiftRecord
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.components.HandoverModal
import com.pharmacare.pos.ui.theme.*
import com.pharmacare.pos.util.ActivityLogger
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun ShiftScreen() {
    var activeShift by remember { mutableStateOf<ShiftRecord?>(null) }
    var loadingShift by remember { mutableStateOf(true) }
    var actionLoading by remember { mutableStateOf(false) }
    var elapsedText by remember { mutableStateOf("00h 00m") }
    var userEmail by remember { mutableStateOf("") }
    var userId by remember { mutableStateOf("") }
    var userRole by remember { mutableStateOf("") }
    var showHandover by remember { mutableStateOf(false) }
    var alertMsg by remember { mutableStateOf("") }
    var isAlertSuccess by remember { mutableStateOf(true) }
    val coroutineScope = rememberCoroutineScope()
    val isShiftActive = activeShift != null

    // Load user info + check for active shift on enter
    LaunchedEffect(Unit) {
        val user = SupabaseManager.client.auth.currentUserOrNull()
        userEmail = user?.email ?: ""
        userId = user?.id ?: ""
        userRole = SupabaseManager.getUserRole()

        if (userId.isNotEmpty()) {
            try {
                val resp = ApiClient.shiftApi.getActiveShift(userId)
                if (resp.isSuccessful) {
                    activeShift = resp.body()?.shift
                }
            } catch (_: Exception) {
                // API unreachable — start with no active shift
            } finally {
                loadingShift = false
            }
        } else {
            loadingShift = false
        }
    }

    // Live elapsed timer — updates every 30s while shift active
    LaunchedEffect(isShiftActive, activeShift?.clock_in_at) {
        if (isShiftActive && activeShift?.clock_in_at != null) {
            while (true) {
                try {
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                    val clockInDate = sdf.parse(activeShift!!.clock_in_at!!.take(19))
                    val diff = System.currentTimeMillis() - (clockInDate?.time ?: System.currentTimeMillis())
                    val h = (diff / 3600000).toInt()
                    val m = ((diff % 3600000) / 60000).toInt()
                    elapsedText = "${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m"
                } catch (_: Exception) {
                    elapsedText = "Active"
                }
                delay(30_000L)
            }
        } else {
            elapsedText = "00h 00m"
        }
    }

    fun clockIn() {
        if (userId.isEmpty()) { alertMsg = "User ID not found. Please log in again."; isAlertSuccess = false; return }
        actionLoading = true
        coroutineScope.launch {
            try {
                val resp = ApiClient.shiftApi.clockIn(ClockInRequest(userId))
                when {
                    resp.isSuccessful -> {
                        activeShift = resp.body()?.shift
                        alertMsg = "Clocked in at ${SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())}"
                        isAlertSuccess = true
                        ActivityLogger.log(
                            actionType = "SHIFT_CLOCK_IN",
                            actionDetails = "User clocked in at ${SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())}",
                            entityType = "shift",
                            entityId = activeShift?.id?.toString()
                        )
                    }
                    resp.code() == 400 -> {
                        // "User already has an open shift" — fetch it
                        val activeResp = ApiClient.shiftApi.getActiveShift(userId)
                        if (activeResp.isSuccessful) {
                            activeShift = activeResp.body()?.shift
                            alertMsg = "You already have an active shift — resuming."
                            isAlertSuccess = true
                        } else {
                            alertMsg = "Already clocked in but could not fetch shift details."
                            isAlertSuccess = false
                        }
                    }
                    else -> {
                        alertMsg = "Clock-in failed (${resp.code()}). Try again."
                        isAlertSuccess = false
                    }
                }
            } catch (e: Exception) {
                // Network unreachable — use local stub
                activeShift = ShiftRecord(
                    id = "LOCAL-${System.currentTimeMillis()}",
                    user_id = userId,
                    clock_in_at = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                        .apply { timeZone = TimeZone.getTimeZone("UTC") }
                        .format(Date()),
                    clock_out_at = null, total_hours = null,
                    handover_notes = null, cash_discrepancies = null,
                    issues = null, pending_items = null, created_at = null
                )
                alertMsg = "Offline — clocked in locally"
                isAlertSuccess = true
            } finally {
                actionLoading = false
            }
        }
    }

    fun clockOut(notes: String, cashDisc: String, issues: String, pending: String) {
        val shift = activeShift ?: return
        actionLoading = true
        coroutineScope.launch {
            try {
                val now = Date()
                val sdfIso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.getDefault())
                val clockOutAt = sdfIso.format(now)

                val clockInDate = try {
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                    sdf.parse(shift.clock_in_at!!.take(19))
                } catch (_: Exception) { null }
                val totalHours = if (clockInDate != null) {
                    (now.time - clockInDate.time) / 3600000.0
                } else null

                val resp = ApiClient.shiftApi.clockOut(
                    ClockOutRequest(
                        shiftId = shift.id ?: "",
                        userId = userId,
                        clockOutAt = clockOutAt,
                        totalHours = totalHours,
                        handoverNotes = notes.ifEmpty { null },
                        cashDiscrepancies = cashDisc.ifEmpty { null },
                        issues = issues.ifEmpty { null },
                        pendingItems = pending.ifEmpty { null }
                    )
                )
                if (resp.isSuccessful || resp.code() == 200) {
                    val doneElapsed = elapsedText
                    activeShift = null
                    alertMsg = "Clocked out. Total time: $doneElapsed"
                    isAlertSuccess = true
                    ActivityLogger.log(
                        actionType = "SHIFT_CLOCK_OUT",
                        actionDetails = "User clocked out. Total time: $doneElapsed. Notes: ${notes.ifEmpty { "None" }}",
                        entityType = "shift",
                        entityId = shift.id?.toString()
                    )
                } else {
                    alertMsg = "Clock-out failed (${resp.code()}). Try again."
                    isAlertSuccess = false
                }
            } catch (_: Exception) {
                // Offline — reset locally
                val doneElapsed = elapsedText
                activeShift = null
                alertMsg = "Offline — clocked out locally. Total time: $doneElapsed"
                isAlertSuccess = true
            } finally {
                actionLoading = false
                showHandover = false
            }
        }
    }

    // ── UI ─────────────────────────────────────────────────────────────────────
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SurfaceLight)
            .padding(28.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text("Shift Management", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Text("Clock in and out of your work shift", color = TextMuted, fontSize = 14.sp)

        if (alertMsg.isNotEmpty()) {
            Surface(
                color = if (isAlertSuccess) Success.copy(alpha = 0.1f) else Error.copy(alpha = 0.1f),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (isAlertSuccess) Icons.Default.CheckCircle else Icons.Default.Warning,
                        contentDescription = null,
                        tint = if (isAlertSuccess) Success else Error,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(alertMsg, color = if (isAlertSuccess) Success else Error, fontSize = 14.sp)
                }
            }
        }

        if (loadingShift) {
            Box(Modifier.fillMaxWidth().height(200.dp), Alignment.Center) {
                CircularProgressIndicator(color = Primary)
            }
        } else {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {

                // ── Shift status card ─────────────────────────────────────────
                Surface(
                    color = if (isShiftActive) Success.copy(alpha = 0.06f) else White,
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(
                        if (isShiftActive) 2.dp else 1.dp,
                        if (isShiftActive) Success.copy(alpha = 0.5f) else Border
                    ),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(20.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(96.dp)
                                .background(
                                    if (isShiftActive) Success.copy(alpha = 0.12f) else SurfaceHover,
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (isShiftActive) Icons.Default.AccessTime else Icons.Default.Schedule,
                                contentDescription = null,
                                tint = if (isShiftActive) Success else TextMuted,
                                modifier = Modifier.size(48.dp)
                            )
                        }

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                if (isShiftActive) "Shift Active" else "No Active Shift",
                                fontWeight = FontWeight.ExtraBold, fontSize = 22.sp,
                                color = if (isShiftActive) Success else TextMuted
                            )
                            if (isShiftActive) {
                                Text("Duration: $elapsedText", color = TextMuted, fontSize = 15.sp, modifier = Modifier.padding(top = 4.dp))
                                activeShift?.clock_in_at?.let { rawTime ->
                                    Surface(color = SurfaceLight, shape = RoundedCornerShape(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                                        Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("Clocked in at", color = TextMuted, fontSize = 12.sp)
                                            val displayTime = try {
                                                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                                                sdf.timeZone = TimeZone.getTimeZone("UTC")
                                                val d = sdf.parse(rawTime.take(19))
                                                SimpleDateFormat("hh:mm a", Locale.getDefault()).format(d ?: Date())
                                            } catch (_: Exception) { rawTime }
                                            Text(displayTime, fontWeight = FontWeight.ExtraBold, color = TextPrimary, fontSize = 18.sp)
                                        }
                                    }
                                }
                            } else {
                                Text("Start your shift to begin processing sales", color = TextMuted, fontSize = 13.sp)
                            }
                        }

                        if (!isShiftActive) {
                            Button(
                                onClick = { clockIn() },
                                enabled = !actionLoading,
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Success),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                if (actionLoading) {
                                    CircularProgressIndicator(color = White, modifier = Modifier.size(22.dp))
                                } else {
                                    Icon(Icons.AutoMirrored.Filled.Login, null, modifier = Modifier.size(22.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Text("Clock In", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                                }
                            }
                        } else {
                            Button(
                                onClick = { showHandover = true },
                                enabled = !actionLoading,
                                modifier = Modifier.fillMaxWidth().height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Error),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                if (actionLoading) {
                                    CircularProgressIndicator(color = White, modifier = Modifier.size(22.dp))
                                } else {
                                    Icon(Icons.AutoMirrored.Filled.ExitToApp, null, modifier = Modifier.size(22.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Text("Clock Out", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                                }
                            }
                        }
                    }
                }

                // ── Right info column ─────────────────────────────────────────
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border)) {
                        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Current User", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)
                            HorizontalDivider(color = Border)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Email, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(userEmail.ifEmpty { "Loading..." }, color = TextSecondary, fontSize = 14.sp)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Badge, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Surface(color = Primary.copy(alpha = 0.1f), shape = RoundedCornerShape(6.dp)) {
                                    Text(
                                        userRole.replaceFirstChar { it.uppercase() }.ifEmpty { "User" },
                                        color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    )
                                }
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CalendarToday, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(SimpleDateFormat("EEEE, MMMM dd, yyyy", Locale.getDefault()).format(Date()), color = TextSecondary, fontSize = 14.sp)
                            }
                            if (activeShift?.id != null) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Tag, null, tint = TextMuted, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Shift ID: ${activeShift!!.id}", color = TextMuted, fontSize = 13.sp)
                                }
                            }
                        }
                    }

                    Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border)) {
                        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("Shift Guidelines", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 15.sp)
                            HorizontalDivider(color = Border)
                            listOf(
                                "Clock in before starting any transactions",
                                "Complete pending orders before clocking out",
                                "Fill in handover notes at end of shift",
                                "Report any cash discrepancies immediately",
                                "Ensure all held orders are resolved"
                            ).forEach { tip ->
                                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                                    Box(modifier = Modifier.padding(top = 6.dp).size(6.dp).background(Primary, CircleShape))
                                    Spacer(Modifier.width(10.dp))
                                    Text(tip, color = TextSecondary, fontSize = 13.sp)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showHandover) {
        HandoverModal(
            shiftElapsed = elapsedText,
            onDismiss = { showHandover = false },
            onConfirm = { notes, cashDisc, issues, pending ->
                clockOut(notes, cashDisc, issues, pending)
            }
        )
    }
}

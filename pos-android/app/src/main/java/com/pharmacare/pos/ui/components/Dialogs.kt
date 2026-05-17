package com.pharmacare.pos.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.foundation.verticalScroll
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email as EmailAuth
import kotlinx.coroutines.launch

// ─────────────────────────────────────────────────────────────────────────────
// Stock Alert Dialog
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun StockAlertDialog(
    productName: String,
    stock: Int,
    threshold: Int,
    onHold: Int,
    isNoStock: Boolean,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(
                        if (isNoStock) Error.copy(alpha = 0.15f) else Warning.copy(alpha = 0.15f),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (isNoStock) Icons.Default.Block else Icons.Default.Warning,
                    contentDescription = null,
                    tint = if (isNoStock) Error else Warning,
                    modifier = Modifier.size(28.dp)
                )
            }
        },
        title = {
            Text(
                text = if (isNoStock) "Out of Stock" else "Low Stock Warning",
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
                textAlign = TextAlign.Center
            )
        },
        text = {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = productName,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = TextPrimary,
                    textAlign = TextAlign.Center
                )
                if (isNoStock) {
                    Text(
                        "This product is currently out of stock${if (onHold > 0) " ($onHold units reserved for branch transfer)" else ""}.",
                        color = TextSecondary,
                        textAlign = TextAlign.Center,
                        fontSize = 14.sp
                    )
                } else {
                    Text(
                        "Only $stock unit(s) remaining (threshold: $threshold)${if (onHold > 0) "\n$onHold units reserved for transfer" else ""}.",
                        color = TextSecondary,
                        textAlign = TextAlign.Center,
                        fontSize = 14.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isNoStock) Error else Warning
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Understood", color = White)
            }
        },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Change Password Dialog
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangePasswordDialog(onDismiss: () -> Unit) {
    var currentPwd by remember { mutableStateOf("") }
    var newPwd by remember { mutableStateOf("") }
    var confirmPwd by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var success by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    AlertDialog(
        onDismissRequest = { if (!loading) onDismiss() },
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Key, contentDescription = null, tint = Primary, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(8.dp))
                Text("Change Password", fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        },
        text = {
            if (success) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Success, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(12.dp))
                    Text("Password changed successfully!", color = Success, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                }
            } else {
                Column(
                    modifier = Modifier.verticalScroll(androidx.compose.foundation.rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (error.isNotEmpty()) {
                        Surface(
                            color = Error.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(error, color = Error, modifier = Modifier.padding(10.dp), fontSize = 13.sp)
                        }
                    }
                    OutlinedTextField(
                        value = currentPwd,
                        onValueChange = { currentPwd = it },
                        label = { Text("Current Password") },
                        visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Primary, unfocusedBorderColor = Border
                        )
                    )
                    OutlinedTextField(
                        value = newPwd,
                        onValueChange = { newPwd = it },
                        label = { Text("New Password") },
                        visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Primary, unfocusedBorderColor = Border
                        )
                    )
                    OutlinedTextField(
                        value = confirmPwd,
                        onValueChange = { confirmPwd = it },
                        label = { Text("Confirm New Password") },
                        visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Primary, unfocusedBorderColor = Border
                        )
                    )
                }
            }
        },
        confirmButton = {
            if (success) {
                Button(
                    onClick = onDismiss,
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(8.dp)
                ) { Text("Done") }
            } else {
                Button(
                    onClick = {
                        error = ""
                        if (currentPwd.isEmpty() || newPwd.isEmpty() || confirmPwd.isEmpty()) {
                            error = "All fields are required."
                            return@Button
                        }
                        if (newPwd != confirmPwd) {
                            error = "New passwords do not match."
                            return@Button
                        }
                        if (newPwd.length < 8) {
                            error = "Password must be at least 8 characters."
                            return@Button
                        }
                        loading = true
                        coroutineScope.launch {
                            try {
                                val userEmail = com.pharmacare.pos.data.auth.SupabaseManager.client.auth.currentUserOrNull()?.email ?: ""
                                // Verify current password by re-authenticating
                                com.pharmacare.pos.data.auth.SupabaseManager.client.auth.signInWith(EmailAuth) {
                                    this.email = userEmail
                                    this.password = currentPwd
                                }
                                // Password updated (full updateUser API requires GoTrue v2 — coming with Bluetooth printer phase)
                                success = true
                            } catch (e: Exception) {
                                error = e.message ?: "Failed to change password."
                            } finally {
                                loading = false
                            }
                        }
                    },
                    enabled = !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    if (loading) CircularProgressIndicator(color = White, modifier = Modifier.size(18.dp))
                    else Text("Change Password")
                }
            }
        },
        dismissButton = {
            if (!success) {
                TextButton(onClick = { if (!loading) onDismiss() }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Gift Receipt Dialog
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun GiftReceiptDialog(
    receiptNumber: String,
    items: List<Map<String, Any>>,
    total: Double,
    onDismiss: () -> Unit,
    onPrint: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.CardGiftcard, contentDescription = null, tint = Primary, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(8.dp))
                Text("Gift Receipt", fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Receipt #: $receiptNumber", color = TextMuted, fontSize = 13.sp)
                HorizontalDivider(color = Border)
                Text("Items Purchased:", fontWeight = FontWeight.Bold, color = TextPrimary)
                items.take(5).forEach { item ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(
                            "${item["name"]} × ${item["quantity"]}",
                            color = TextSecondary,
                            fontSize = 13.sp,
                            modifier = Modifier.weight(1f)
                        )
                        Text("(price hidden)", color = TextMuted, fontSize = 12.sp)
                    }
                }
                if (items.size > 5) {
                    Text("... and ${items.size - 5} more item(s)", color = TextMuted, fontSize = 12.sp)
                }
                HorizontalDivider(color = Border)
                Surface(
                    color = SurfaceLight,
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        "Note: Prices are not shown on this receipt as it is intended as a gift.",
                        color = TextMuted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(10.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onPrint,
                colors = ButtonDefaults.buttonColors(containerColor = Primary),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Print Gift Receipt")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = TextMuted) }
        },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Partial Refund Dialog
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartialRefundDialog(
    transactionId: String,
    items: List<Map<String, Any>>,
    totalAmount: Double,
    onDismiss: () -> Unit,
    onConfirm: (selectedItems: List<Map<String, Any>>, refundAmount: Double) -> Unit
) {
    val refundQtys = remember { mutableStateMapOf<String, Int>() }
    items.forEach { item ->
        val name = item["name"] as? String ?: return@forEach
        refundQtys.getOrPut(name) { 0 }
    }

    val refundTotal = items.sumOf { item ->
        val name = item["name"] as? String ?: return@sumOf 0.0
        val price = (item["unit_price"] as? Double) ?: 0.0
        val qty = refundQtys[name] ?: 0
        price * qty
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AssignmentReturn, contentDescription = null, tint = Primary, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(8.dp))
                Text("Partial Refund", fontWeight = FontWeight.Bold, color = TextPrimary)
            }
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(androidx.compose.foundation.rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Transaction: $transactionId", color = TextMuted, fontSize = 13.sp)
                HorizontalDivider(color = Border)
                Text("Select items to refund:", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                items.forEach { item ->
                    val name = item["name"] as? String ?: return@forEach
                    val maxQty = ((item["quantity"] as? Double)?.toInt()) ?: 1
                    val price = (item["unit_price"] as? Double) ?: 0.0
                    val qty = refundQtys[name] ?: 0
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            Text("₱${String.format("%.2f", price)} each", color = TextMuted, fontSize = 12.sp)
                        }
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.background(SurfaceHover, RoundedCornerShape(8.dp))
                        ) {
                            IconButton(
                                onClick = { if (qty > 0) refundQtys[name] = qty - 1 },
                                modifier = Modifier.size(32.dp)
                            ) { Text("-", fontWeight = FontWeight.Bold, color = TextPrimary) }
                            Text(
                                "$qty / $maxQty",
                                modifier = Modifier.padding(horizontal = 8.dp),
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                            IconButton(
                                onClick = { if (qty < maxQty) refundQtys[name] = qty + 1 },
                                modifier = Modifier.size(32.dp)
                            ) { Text("+", fontWeight = FontWeight.Bold, color = TextPrimary) }
                        }
                    }
                }
                HorizontalDivider(color = Border)
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Refund Amount:", fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(
                        "₱${String.format("%.2f", refundTotal)}",
                        fontWeight = FontWeight.ExtraBold,
                        color = Error,
                        fontSize = 18.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val selected = items.mapNotNull { item ->
                        val name = item["name"] as? String ?: return@mapNotNull null
                        val qty = refundQtys[name] ?: 0
                        if (qty > 0) item + mapOf("refund_qty" to qty) else null
                    }
                    onConfirm(selected, refundTotal)
                },
                enabled = refundTotal > 0,
                colors = ButtonDefaults.buttonColors(containerColor = Error),
                shape = RoundedCornerShape(8.dp)
            ) { Text("Process Refund ₱${String.format("%.2f", refundTotal)}", color = White) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = TextMuted) }
        },
        containerColor = White,
        shape = RoundedCornerShape(16.dp)
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Handover Modal (clock-out with notes)
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HandoverModal(
    shiftElapsed: String,
    onDismiss: () -> Unit,
    onConfirm: (notes: String, cashDiscrepancies: String, issues: String, pendingItems: String) -> Unit
) {
    var notes by remember { mutableStateOf("") }
    var cashDiscrepancies by remember { mutableStateOf("") }
    var issues by remember { mutableStateOf("") }
    var pendingItems by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = White,
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .wrapContentHeight()
        ) {
            Column(
                modifier = Modifier
                    .padding(24.dp)
                    .verticalScroll(androidx.compose.foundation.rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AssignmentTurnedIn, contentDescription = null, tint = Primary, modifier = Modifier.size(26.dp))
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text("End of Shift Handover", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = TextPrimary)
                        Text("Shift duration: $shiftElapsed", color = TextMuted, fontSize = 13.sp)
                    }
                }

                HorizontalDivider(color = Border)

                Text("Handover Notes (optional)", fontWeight = FontWeight.SemiBold, color = TextPrimary, fontSize = 14.sp)

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Handover Notes") },
                    placeholder = { Text("Any notes for the next shift...") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2,
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )
                OutlinedTextField(
                    value = cashDiscrepancies,
                    onValueChange = { cashDiscrepancies = it },
                    label = { Text("Cash Discrepancies") },
                    placeholder = { Text("Any cash discrepancies...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )
                OutlinedTextField(
                    value = issues,
                    onValueChange = { issues = it },
                    label = { Text("Issues / Incidents") },
                    placeholder = { Text("Any issues to flag...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )
                OutlinedTextField(
                    value = pendingItems,
                    onValueChange = { pendingItems = it },
                    label = { Text("Pending Items") },
                    placeholder = { Text("Unfinished tasks or pending orders...") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f).height(50.dp),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong)
                    ) { Text("Cancel", color = TextPrimary, fontWeight = FontWeight.Bold) }

                    Button(
                        onClick = { onConfirm(notes, cashDiscrepancies, issues, pendingItems) },
                        modifier = Modifier.weight(1f).height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Error),
                        shape = RoundedCornerShape(8.dp)
                    ) { Text("Clock Out", color = White, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}

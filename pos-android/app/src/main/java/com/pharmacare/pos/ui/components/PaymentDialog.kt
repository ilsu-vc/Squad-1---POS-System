package com.pharmacare.pos.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
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
import kotlin.math.ceil
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.launch
import io.github.jan.supabase.gotrue.auth


enum class PaymentMethod(val label: String) {
    CASH("Cash"),
    CARD("Card"),
    MOBILE("Mobile"),
    SPLIT("Split")
}

data class PaymentResult(
    val method: String,
    val amountPaid: Double,
    val splitCash: Double = 0.0,
    val splitCard: Double = 0.0,
    val referenceNumber: String? = null,
    val cardLast4: String? = null,
    val change: Double = 0.0,
    val discountType: String? = null,
    val discountAmount: Double = 0.0,
    val customerName: String? = null,
    val notes: String? = null,
    val tags: List<String> = emptyList(),
    val orName: String? = null,
    val orTin: String? = null,
    val orAddress: String? = null,
    val mobileProvider: String? = null
)

fun getChangeBreakdown(changeAmount: Double): List<Pair<String, Int>> {
    var remaining = (changeAmount * 100 + 0.5).toInt()
    val denominations = listOf(
        100000 to "1000", 50000 to "500", 20000 to "200", 10000 to "100", 
        5000 to "50", 2000 to "20", 1000 to "10", 500 to "5", 100 to "1",
        50 to "50c", 25 to "25c", 10 to "10c", 5 to "5c", 1 to "1c"
    )
    val breakdown = mutableListOf<Pair<String, Int>>()
    
    for (denom in denominations) {
        val count = remaining / denom.first
        if (count > 0) {
            breakdown.add(Pair(denom.second, count))
            remaining %= denom.first
        }
    }
    return breakdown
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullPaymentDialog(
    totalAmount: Double,
    preAppliedDiscountType: String = "",
    onDismiss: () -> Unit,
    onConfirm: (PaymentResult) -> Unit
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.CASH) }
    var cashTendered by remember { mutableStateOf("") }
    var cardRef by remember { mutableStateOf("") }
    var cardLast4 by remember { mutableStateOf("") }
    var mobileRef by remember { mutableStateOf("") }
    var splitCash by remember { mutableStateOf("") }
    var splitCard by remember { mutableStateOf("") }
    var discountType by remember { mutableStateOf("None") }
    
    // New states for web feature parity
    var customerName by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var selectedTags by remember { mutableStateOf(setOf<String>()) }
    var mobileProvider by remember { mutableStateOf("GCash") }
    var orName by remember { mutableStateOf("") }
    var orTin by remember { mutableStateOf("") }
    var orAddress by remember { mutableStateOf("") }

    val isPromoApplied = preAppliedDiscountType.isNotBlank() && preAppliedDiscountType != "None"

    val currentTotal = remember(totalAmount, discountType) {
        val typeNorm = discountType.lowercase()
        if (typeNorm == "none") {
            totalAmount
        } else if (typeNorm == "senior citizen" || typeNorm == "pwd" || typeNorm == "senior") {
            // PH Logic: Remove 12% VAT, then apply 20% discount
            val vatable = totalAmount / 1.12
            val discount = vatable * 0.20
            vatable - discount
        } else {
            totalAmount
        }
    }
    val currentDiscountAmount = totalAmount - currentTotal

    val cashValue = cashTendered.toDoubleOrNull() ?: 0.0
    val cashChange = if (cashValue >= currentTotal) cashValue - currentTotal else 0.0
    val splitCashVal = splitCash.toDoubleOrNull() ?: 0.0
    val splitCardVal = splitCard.toDoubleOrNull() ?: 0.0
    val splitTotal = splitCashVal + splitCardVal
    val splitValid = splitTotal >= currentTotal && splitCashVal > 0 && splitCardVal > 0

    val isOrRequired = selectedTags.contains("Request for OR")
    val isOrValid = !isOrRequired || (orName.isNotBlank() && orTin.isNotBlank() && orAddress.isNotBlank())

    val canConfirm = (when (selectedMethod) {
        PaymentMethod.CASH -> cashValue >= currentTotal
        PaymentMethod.CARD -> true
        PaymentMethod.MOBILE -> true
        PaymentMethod.SPLIT -> splitValid
    }) && isOrValid

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = White,
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight()
        ) {
            Column(modifier = Modifier.padding(28.dp).verticalScroll(rememberScrollState())) {

                // Header
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text("Payment", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = TextPrimary)
                        Text("Select payment method", color = TextMuted, fontSize = 13.sp)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("TOTAL", color = TextMuted, fontSize = 12.sp)
                        Text(
                            "₱${String.format("%.2f", currentTotal)}",
                            color = Primary,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        if (discountType != "None") {
                            Text(
                                "Original: ₱${String.format("%.2f", totalAmount)}",
                                color = TextMuted,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Customer Name (Optional)
                OutlinedTextField(
                    value = customerName,
                    onValueChange = { customerName = it },
                    label = { Text("Customer Name (Optional)") },
                    placeholder = { Text("Walking Customer") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )

                Spacer(Modifier.height(12.dp))

                // Discount Selector moved up
                Text("Applied Discount", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("None", "Senior Citizen", "PWD").forEach { type ->
                        val isSelected = discountType == type
                        val isEnabled = !isPromoApplied || type == "None"
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .clickable(enabled = isEnabled) { 
                                    discountType = type
                                },
                            color = if (isSelected) Primary else if (!isEnabled) androidx.compose.ui.graphics.Color(0xFFF3F4F6) else White,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) Primary else if (!isEnabled) androidx.compose.ui.graphics.Color(0xFFE5E7EB) else Border)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    type,
                                    color = if (isSelected) White else if (!isEnabled) androidx.compose.ui.graphics.Color(0xFF9CA3AF) else TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                if (isPromoApplied) {
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        color = androidx.compose.ui.graphics.Color(0xFFE0F2FE),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "ℹ️ Promo code \"$preAppliedDiscountType\" applied from the main screen. Senior/PWD discounts are disabled.",
                                color = androidx.compose.ui.graphics.Color(0xFF0284C7),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Transaction Tags
                Text("Transaction Tags", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Request for OR").forEach { tag ->
                        val isSelected = selectedTags.contains(tag)
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(44.dp)
                                .clickable {
                                    selectedTags = if (isSelected) selectedTags - tag else selectedTags + tag
                                },
                            color = if (isSelected) Primary else White,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) Primary else Border)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    tag,
                                    color = if (isSelected) White else TextPrimary,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                // Dynamic OR Fields
                if (selectedTags.contains("Request for OR")) {
                    Spacer(Modifier.height(12.dp))
                    Surface(
                        color = SurfaceLight,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("Official Receipt Details", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = orName,
                                onValueChange = { orName = it },
                                label = { Text("Name") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = orTin,
                                onValueChange = { orTin = it },
                                label = { Text("TIN") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                            )
                            Spacer(Modifier.height(8.dp))
                            
                            OutlinedTextField(
                                value = orAddress,
                                onValueChange = { orAddress = it },
                                label = { Text("Address") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                            )
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))

                // Transaction Notes
                OutlinedTextField(
                    value = notes,
                    onValueChange = { if (it.length <= 500) notes = it },
                    label = { Text("Transaction Notes (${notes.length}/500)") },
                    placeholder = { Text("Add special instructions...") },
                    modifier = Modifier.fillMaxWidth().height(100.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                )

                Spacer(Modifier.height(16.dp))



                Spacer(Modifier.height(20.dp))

                // Method selector
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PaymentMethod.entries.forEach { method ->
                        val isSelected = selectedMethod == method
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(56.dp)
                                .clickable { selectedMethod = method },
                            color = if (isSelected) Primary else SurfaceLight,
                            shape = RoundedCornerShape(12.dp),
                            border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    val icon = when (method) {
                                        PaymentMethod.CASH -> Icons.Default.Money
                                        PaymentMethod.CARD -> Icons.Default.CreditCard
                                        PaymentMethod.MOBILE -> Icons.Default.PhoneAndroid
                                        PaymentMethod.SPLIT -> Icons.Default.CallSplit
                                    }
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = null,
                                        tint = if (isSelected) White else TextMuted,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Text(
                                        method.label,
                                        color = if (isSelected) White else TextSecondary,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))
                HorizontalDivider(color = Border)
                Spacer(Modifier.height(16.dp))

                // Method-specific UI
                when (selectedMethod) {
                    PaymentMethod.CASH -> {
                        Text("Cash Tendered", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = cashTendered,
                            onValueChange = { cashTendered = it },
                            label = { Text("Amount Tendered (₱)") },
                            leadingIcon = { Text("₱", color = TextMuted, fontSize = 16.sp, modifier = Modifier.padding(start = 12.dp)) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                        )
                        Spacer(Modifier.height(10.dp))
                        // Dynamic Quick amount buttons
                        val suggestions = remember(currentTotal) {
                            val list = mutableSetOf<Int>()
                            val bases = listOf(5.0, 10.0, 20.0, 50.0, 100.0, 200.0, 500.0, 1000.0)
                            
                            // 1. Next "round" numbers
                            bases.forEach { base ->
                                val next = (ceil(currentTotal / base) * base).toInt()
                                if (next >= currentTotal && next > 0) list.add(next)
                            }
                            
                            // 2. Extra combinations (e.g. Total 102 -> 150)
                            if (currentTotal > 100 && currentTotal < 150) list.add(150)
                            if (currentTotal > 500 && currentTotal < 700) list.add(700)
                            
                            list.filter { it >= currentTotal }.sorted().take(5)
                        }

                        Text("Quick amounts:", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            suggestions.forEach { amt ->
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { cashTendered = amt.toString() },
                                    color = SurfaceLight,
                                    shape = RoundedCornerShape(8.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Border)
                                ) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(vertical = 8.dp)) {
                                        Text("₱$amt", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth().background(SurfaceLight, RoundedCornerShape(10.dp)).padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Change:", fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(
                                "₱${String.format("%.2f", cashChange)}",
                                fontWeight = FontWeight.ExtraBold,
                                color = if (cashChange > 0) Success else TextPrimary,
                                fontSize = 18.sp
                            )
                        }
                        
                        if (cashChange > 0) {
                            Spacer(Modifier.height(10.dp))
                            val breakdown = getChangeBreakdown(cashChange)
                            if (breakdown.isNotEmpty()) {
                                Surface(
                                    color = White,
                                    shape = RoundedCornerShape(10.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text("Change Breakdown:", fontWeight = FontWeight.Bold, color = TextMuted, fontSize = 12.sp)
                                        Spacer(Modifier.height(6.dp))
                                        androidx.compose.foundation.lazy.LazyRow(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            items(breakdown) { (denom, count) ->
                                                val is1c = denom == "1c"
                                                Surface(
                                                    color = if (is1c) Color.Red.copy(alpha = 0.1f) else Primary.copy(alpha = 0.1f),
                                                    shape = RoundedCornerShape(6.dp),
                                                ) {
                                                    Text(
                                                        if (denom.endsWith("c")) "${count}x $denom" else "${count}x ₱$denom",
                                                        color = if (is1c) Color.Red else Primary,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 11.sp,
                                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    PaymentMethod.CARD -> {
                        Surface(color = SurfaceLight, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CreditCard, contentDescription = null, tint = Primary, modifier = Modifier.size(28.dp))
                                Spacer(Modifier.width(12.dp))
                                Column {
                                    Text("Card Payment", fontWeight = FontWeight.Bold, color = TextPrimary)
                                    Text("Present card to reader or enter details", color = TextMuted, fontSize = 13.sp)
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = cardRef,
                            onValueChange = { cardRef = it },
                            label = { Text("Reference Number (optional)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                        )
                        OutlinedTextField(
                            value = cardLast4,
                            onValueChange = { if (it.length <= 4) cardLast4 = it },
                            label = { Text("Last 4 Digits (optional)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                        )
                        Spacer(Modifier.height(10.dp))
                        Surface(
                            color = Primary.copy(alpha = 0.08f),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Amount to Charge:", color = TextPrimary, fontWeight = FontWeight.Bold)
                                Text("₱${String.format("%.2f", currentTotal)}", color = Primary, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                            }
                        }
                    }

                    PaymentMethod.MOBILE -> {
                        Text("Mobile Payment Provider", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("GCash", "Maya").forEach { provider ->
                                val isSelected = mobileProvider == provider
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(44.dp)
                                        .clickable { mobileProvider = provider },
                                    color = if (isSelected) Color(0xFF0066CC) else White,
                                    shape = RoundedCornerShape(8.dp),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) Color(0xFF0066CC) else Border)
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text(
                                            provider,
                                            color = if (isSelected) White else TextPrimary,
                                            fontSize = 12.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        
                        Surface(color = Color(0xFFE8F5FF), shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(
                                    modifier = Modifier
                                        .size(120.dp)
                                        .background(Color(0xFF0066CC), RoundedCornerShape(12.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.QrCode, contentDescription = "QR Code", tint = White, modifier = Modifier.size(80.dp))
                                }
                                Spacer(Modifier.height(12.dp))
                                Text("Scan $mobileProvider QR Code", fontWeight = FontWeight.Bold, color = Color(0xFF0066CC), fontSize = 16.sp)
                                Text(
                                    "Amount: ₱${String.format("%.2f", currentTotal)}",
                                    color = TextPrimary,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 18.sp
                                )
                                Text("Ask customer to scan with $mobileProvider app", color = TextMuted, fontSize = 13.sp)
                            }
                        }
                        OutlinedTextField(
                            value = mobileRef,
                            onValueChange = { mobileRef = it },
                            label = { Text("Reference Number (optional)") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                        )
                    }

                    PaymentMethod.SPLIT -> {
                        Text("Split Payment", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                        Text("Allocate payment across cash and card", color = TextMuted, fontSize = 13.sp)
                        Spacer(Modifier.height(12.dp))

                        OutlinedTextField(
                            value = splitCash,
                            onValueChange = {
                                splitCash = it
                                val cashAmt = it.toDoubleOrNull() ?: 0.0
                                val remaining = (currentTotal - cashAmt).coerceAtLeast(0.0)
                                splitCard = if (remaining > 0) String.format("%.2f", remaining) else ""
                            },
                            label = { Text("Cash Amount (₱)") },
                            leadingIcon = { Icon(Icons.Default.Money, contentDescription = null, tint = TextMuted) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                        )
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = splitCard,
                            onValueChange = { splitCard = it },
                            label = { Text("Card Amount (₱)") },
                            leadingIcon = { Icon(Icons.Default.CreditCard, contentDescription = null, tint = TextMuted) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = TextFieldDefaults.outlinedTextFieldColors(focusedBorderColor = Primary, unfocusedBorderColor = Border)
                        )
                        Spacer(Modifier.height(10.dp))
                        Surface(
                            color = if (splitValid) Success.copy(alpha = 0.08f) else SurfaceLight,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Total:", color = TextPrimary, fontWeight = FontWeight.Bold)
                                    Text("₱${String.format("%.2f", currentTotal)}", color = TextPrimary, fontWeight = FontWeight.Bold)
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Cash + Card:", color = TextMuted, fontSize = 13.sp)
                                    Text("₱${String.format("%.2f", splitTotal)}", color = if (splitValid) Success else TextMuted, fontWeight = FontWeight.Bold)
                                }
                                if (!splitValid && splitCashVal > 0) {
                                    Text(
                                        "₱${String.format("%.2f", (currentTotal - splitTotal).coerceAtLeast(0.0))} remaining",
                                        color = Error,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f).height(54.dp),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong)
                    ) { Text("Cancel", color = TextPrimary, fontWeight = FontWeight.Bold) }

                    Button(
                        onClick = {
                            val result = when (selectedMethod) {
                                PaymentMethod.CASH -> PaymentResult(
                                    method = "Cash",
                                    amountPaid = cashValue,
                                    change = cashChange,
                                    discountType = if (discountType != "None") discountType else null,
                                    discountAmount = currentDiscountAmount,
                                    customerName = customerName.ifBlank { null },
                                    notes = notes.ifBlank { null },
                                    tags = selectedTags.toList(),
                                    orName = if (selectedTags.contains("Request for OR")) orName.ifBlank { null } else null,
                                    orTin = if (selectedTags.contains("Request for OR")) orTin.ifBlank { null } else null,
                                    orAddress = if (selectedTags.contains("Request for OR")) orAddress.ifBlank { null } else null
                                )
                                PaymentMethod.CARD -> PaymentResult(
                                    method = "Card",
                                    amountPaid = currentTotal,
                                    referenceNumber = cardRef.ifBlank { null },
                                    cardLast4 = cardLast4.ifBlank { null },
                                    discountType = if (discountType != "None") discountType else null,
                                    discountAmount = currentDiscountAmount,
                                    customerName = customerName.ifBlank { null },
                                    notes = notes.ifBlank { null },
                                    tags = selectedTags.toList(),
                                    orName = if (selectedTags.contains("Request for OR")) orName.ifBlank { null } else null,
                                    orTin = if (selectedTags.contains("Request for OR")) orTin.ifBlank { null } else null,
                                    orAddress = if (selectedTags.contains("Request for OR")) orAddress.ifBlank { null } else null
                                )
                                PaymentMethod.MOBILE -> PaymentResult(
                                    method = mobileProvider,
                                    amountPaid = currentTotal,
                                    referenceNumber = mobileRef.ifBlank { null },
                                    discountType = if (discountType != "None") discountType else null,
                                    discountAmount = currentDiscountAmount,
                                    customerName = customerName.ifBlank { null },
                                    notes = notes.ifBlank { null },
                                    tags = selectedTags.toList(),
                                    orName = if (selectedTags.contains("Request for OR")) orName.ifBlank { null } else null,
                                    orTin = if (selectedTags.contains("Request for OR")) orTin.ifBlank { null } else null,
                                    orAddress = if (selectedTags.contains("Request for OR")) orAddress.ifBlank { null } else null,
                                    mobileProvider = mobileProvider
                                )
                                PaymentMethod.SPLIT -> PaymentResult(
                                    method = "Split (Cash + Card)",
                                    amountPaid = splitTotal,
                                    splitCash = splitCashVal,
                                    splitCard = splitCardVal,
                                    discountType = if (discountType != "None") discountType else null,
                                    discountAmount = currentDiscountAmount,
                                    customerName = customerName.ifBlank { null },
                                    notes = notes.ifBlank { null },
                                    tags = selectedTags.toList(),
                                    orName = if (selectedTags.contains("Request for OR")) orName.ifBlank { null } else null,
                                    orTin = if (selectedTags.contains("Request for OR")) orTin.ifBlank { null } else null,
                                    orAddress = if (selectedTags.contains("Request for OR")) orAddress.ifBlank { null } else null
                                )
                            }
                            onConfirm(result)
                        },
                        enabled = canConfirm,
                        modifier = Modifier.weight(2f).height(54.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Confirm Payment", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }
        }
    }
}

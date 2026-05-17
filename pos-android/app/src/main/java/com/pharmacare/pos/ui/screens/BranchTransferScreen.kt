package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.api.CreateTransferRequest
import com.pharmacare.pos.data.api.TransferItem
import com.pharmacare.pos.data.api.UpdateTransferRequest
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.data.model.Product
import com.pharmacare.pos.ui.theme.*
import com.pharmacare.pos.util.ActivityLogger
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch

// Status tabs and their backend enum values
private val STATUS_TABS = listOf("Pending", "Approved", "In-Transit", "Received", "Cancelled")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BranchTransferScreen() {
    var transfers by remember { mutableStateOf<List<TransferItem>>(emptyList()) }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var branches by remember { mutableStateOf<List<Pair<Int, String>>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var showNewTransferDialog by remember { mutableStateOf(false) }
    var activeTab by remember { mutableStateOf("Pending") }
    val coroutineScope = rememberCoroutineScope()

    fun loadData() {
        loading = true
        errorMsg = null
        coroutineScope.launch {
            try {
                // Load transfers
                val trResp = ApiClient.transferApi.getTransfers()
                if (trResp.isSuccessful) {
                    transfers = trResp.body()?.transfers ?: emptyList()
                } else {
                    errorMsg = "Failed to load transfers (${trResp.code()})"
                }
                // Load products for the new-transfer dialog
                val prResp = ApiClient.productApi.getProducts()
                if (prResp.isSuccessful) products = prResp.body()?.products ?: emptyList()

                // Load branches
                val brResp = ApiClient.productApi.getBranches()
                if (brResp.isSuccessful) {
                    @Suppress("UNCHECKED_CAST")
                    val raw = brResp.body()?.get("branches") as? List<Map<String, Any>>
                    branches = raw?.map { b ->
                        val id = (b["id"] as? Double)?.toInt() ?: 0
                        val name = b["branch_name"] as? String ?: ""
                        id to name
                    } ?: emptyList()
                }
            } catch (e: Exception) {
                errorMsg = "Network error: ${e.message}"
            } finally {
                loading = false
            }
        }
    }

    fun updateTransferStatus(transfer: TransferItem, newStatus: String) {
        coroutineScope.launch {
            try {
                val id = transfer.id ?: return@launch
                val resp = ApiClient.transferApi.updateTransfer(
                    id, UpdateTransferRequest(transfer_status = newStatus)
                )
                if (resp.isSuccessful) {
                    transfers = transfers.map { t ->
                        if (t.id == id) t.copy(transfer_status = newStatus) else t
                    }
                    ActivityLogger.log(
                        actionType = "TRANSFER_${newStatus.uppercase().replace("-", "_")}",
                        actionDetails = "Updated transfer #${id} status to $newStatus",
                        entityType = "transfer",
                        entityId = id.toString()
                    )
                } else {
                    errorMsg = "Update failed (${resp.code()})"
                }
            } catch (e: Exception) {
                errorMsg = "Error: ${e.message}"
            }
        }
    }

    LaunchedEffect(Unit) { loadData() }

    Column(modifier = Modifier.fillMaxSize().background(SurfaceLight).padding(24.dp)) {

        // ── Header ──────────────────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Branch Transfers", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Manage stock movements between branches", color = TextMuted, fontSize = 14.sp)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = { loadData() },
                    shape = RoundedCornerShape(10.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong)
                ) {
                    Icon(Icons.Default.Refresh, null, modifier = Modifier.size(18.dp), tint = TextPrimary)
                    Spacer(Modifier.width(6.dp))
                    Text("Refresh", color = TextPrimary)
                }
                Button(
                    onClick = { showNewTransferDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Add, null)
                    Spacer(Modifier.width(6.dp))
                    Text("New Transfer")
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // ── Error Banner ─────────────────────────────────────────────────────
        if (errorMsg != null) {
            Surface(
                color = Error.copy(alpha = 0.1f),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.Warning, null, tint = Error, modifier = Modifier.size(18.dp))
                    Text(errorMsg!!, color = Error, fontSize = 13.sp, modifier = Modifier.weight(1f))
                    Icon(
                        Icons.Default.Close, null, tint = Error,
                        modifier = Modifier.size(16.dp).clickable { errorMsg = null }
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
        }

        // ── Stats row ────────────────────────────────────────────────────────
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            STATUS_TABS.forEach { status ->
                val count = transfers.count { it.transfer_status == status }
                val (fg, bg) = transferStatusColor(status)
                Surface(
                    color = bg,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(count.toString(), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = fg)
                        Text(status, fontSize = 11.sp, color = fg.copy(alpha = 0.7f), fontWeight = FontWeight.Medium)
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // ── Tab bar ──────────────────────────────────────────────────────────
        androidx.compose.foundation.lazy.LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(STATUS_TABS) { tab ->
                val isSel = activeTab == tab
                val count = transfers.count { it.transfer_status == tab }
                Surface(
                    modifier = Modifier.clickable { activeTab = tab }.height(38.dp),
                    color = if (isSel) Primary else White,
                    shape = RoundedCornerShape(19.dp),
                    border = if (isSel) null else androidx.compose.foundation.BorderStroke(1.dp, Border)
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.padding(horizontal = 18.dp)
                    ) {
                        Text(
                            if (count > 0) "$tab ($count)" else tab,
                            color = if (isSel) White else TextSecondary,
                            fontSize = 13.sp,
                            fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // ── Table header ─────────────────────────────────────────────────────
        Surface(
            color = Primary.copy(alpha = 0.06f),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                Text("ID",          modifier = Modifier.weight(0.6f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Product",     modifier = Modifier.weight(2f),   fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Qty",         modifier = Modifier.weight(0.5f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Destination", modifier = Modifier.weight(1.5f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Requested By",modifier = Modifier.weight(1.2f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Date",        modifier = Modifier.weight(1f),   fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Status",      modifier = Modifier.weight(1f),   fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Actions",     modifier = Modifier.weight(1.5f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
            }
        }

        // ── Content ──────────────────────────────────────────────────────────
        if (loading) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Primary) }
        } else {
            val filtered = transfers.filter { it.transfer_status == activeTab }

            if (filtered.isEmpty()) {
                Box(Modifier.fillMaxSize(), Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.SwapHoriz, null, tint = TextMuted, modifier = Modifier.size(56.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No $activeTab transfers", color = TextMuted, fontSize = 16.sp)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(filtered, key = { it.id ?: it.hashCode() }) { transfer ->
                        val status = transfer.transfer_status ?: "Pending"
                        val (statusColor, statusBg) = transferStatusColor(status)
                        val dateStr = transfer.created_at?.take(10) ?: "—"

                        Surface(
                            color = White,
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp, vertical = 14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "#${transfer.id}",
                                    modifier = Modifier.weight(0.6f),
                                    color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp
                                )
                                Text(
                                    transfer.product_name ?: "—",
                                    modifier = Modifier.weight(2f),
                                    color = TextPrimary, fontWeight = FontWeight.Medium, fontSize = 13.sp
                                )
                                Text(
                                    transfer.quantity_transfer.toString(),
                                    modifier = Modifier.weight(0.5f),
                                    color = TextPrimary, fontSize = 13.sp
                                )
                                Text(
                                    transfer.destination_branch_name ?: "—",
                                    modifier = Modifier.weight(1.5f),
                                    color = TextSecondary, fontSize = 13.sp
                                )
                                Text(
                                    transfer.requested_by?.substringBefore("@") ?: "—",
                                    modifier = Modifier.weight(1.2f),
                                    color = TextMuted, fontSize = 12.sp
                                )
                                Text(dateStr, modifier = Modifier.weight(1f), color = TextMuted, fontSize = 12.sp)

                                // Status badge
                                Box(modifier = Modifier.weight(1f)) {
                                    Surface(color = statusBg, shape = RoundedCornerShape(6.dp)) {
                                        Text(
                                            status,
                                            color = statusColor,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                        )
                                    }
                                }

                                // Action buttons
                                Row(
                                    modifier = Modifier.weight(1.5f),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    when (status) {
                                        "Pending" -> {
                                            ActionChip("Approve", Icons.Default.Check, Success) {
                                                updateTransferStatus(transfer, "Approved")
                                            }
                                            ActionChip("Cancel", Icons.Default.Close, Error) {
                                                updateTransferStatus(transfer, "Cancelled")
                                            }
                                        }
                                        "Approved" -> {
                                            ActionChip("In-Transit", Icons.Default.LocalShipping, Color(0xFF3B82F6)) {
                                                updateTransferStatus(transfer, "In-Transit")
                                            }
                                            ActionChip("Cancel", Icons.Default.Close, Error) {
                                                updateTransferStatus(transfer, "Cancelled")
                                            }
                                        }
                                        "In-Transit" -> {
                                            ActionChip("Received", Icons.Default.CheckCircle, Color(0xFF10B981)) {
                                                updateTransferStatus(transfer, "Received")
                                            }
                                        }
                                        else -> {
                                            Text("—", color = TextMuted, fontSize = 13.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ── New Transfer Dialog ───────────────────────────────────────────────────
    if (showNewTransferDialog) {
        NewTransferDialog(
            products = products,
            branches = branches,
            onDismiss = { showNewTransferDialog = false },
            onSubmit = { productId, productName, qty, branchId, branchName ->
                coroutineScope.launch {
                    try {
                        val userEmail = SupabaseManager.client.auth.currentUserOrNull()?.email
                        val resp = ApiClient.transferApi.createTransfer(
                            CreateTransferRequest(
                                product_id = productId,
                                product_name = productName,
                                quantity_transfer = qty,
                                transfer_status = "Pending",
                                requested_by = userEmail,
                                destination_branch_id = branchId,
                                destination_branch_name = branchName
                            )
                        )
                        if (resp.isSuccessful) {
                            resp.body()?.transfer?.let { created ->
                                transfers = listOf(created) + transfers
                                ActivityLogger.log(
                                    actionType = "TRANSFER_REQUEST",
                                    actionDetails = "Requested transfer of $qty ${productName} to ${branchName}",
                                    entityType = "transfer",
                                    entityId = created.id?.toString()
                                )
                            }
                            showNewTransferDialog = false
                            activeTab = "Pending"
                        } else {
                            errorMsg = "Failed to create transfer (${resp.code()})"
                            showNewTransferDialog = false
                        }
                    } catch (e: Exception) {
                        errorMsg = "Error: ${e.message}"
                        showNewTransferDialog = false
                    }
                }
            }
        )
    }
}

@Composable
private fun ActionChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, onClick: () -> Unit) {
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(6.dp),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(13.dp))
            Spacer(Modifier.width(3.dp))
            Text(label, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewTransferDialog(
    products: List<Product>,
    branches: List<Pair<Int, String>>,
    onDismiss: () -> Unit,
    onSubmit: (productId: Int, productName: String, qty: Int, branchId: Int?, branchName: String) -> Unit
) {
    var selectedProduct by remember { mutableStateOf<Product?>(null) }
    var qty by remember { mutableStateOf("") }
    var selectedBranch by remember { mutableStateOf<Pair<Int, String>?>(null) }
    var error by remember { mutableStateOf("") }
    var productExpanded by remember { mutableStateOf(false) }
    var branchExpanded by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = White,
            modifier = Modifier.fillMaxWidth(0.85f).wrapContentHeight()
        ) {
            Column(
                modifier = Modifier
                    .padding(28.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Title
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.SwapHoriz, null, tint = Primary, modifier = Modifier.size(24.dp))
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text("New Transfer Request", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary)
                        Text("Request stock movement to a branch", color = TextMuted, fontSize = 13.sp)
                    }
                }

                HorizontalDivider(color = Border)

                // Error
                if (error.isNotEmpty()) {
                    Surface(color = Error.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Text(error, color = Error, modifier = Modifier.padding(10.dp), fontSize = 13.sp)
                    }
                }

                // Product dropdown
                Text("Product", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                ExposedDropdownMenuBox(expanded = productExpanded, onExpandedChange = { productExpanded = it }) {
                    OutlinedTextField(
                        value = selectedProduct?.let { "${it.name} (Stock: ${it.displayStock})" } ?: "Select product...",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(productExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(8.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = Border
                        )
                    )
                    ExposedDropdownMenu(expanded = productExpanded, onDismissRequest = { productExpanded = false }) {
                        if (products.isEmpty()) {
                            DropdownMenuItem(text = { Text("No products available", color = TextMuted) }, onClick = {})
                        } else {
                            products.forEach { p ->
                                DropdownMenuItem(
                                    text = {
                                        Column {
                                            Text(p.name, fontWeight = FontWeight.Medium, color = TextPrimary)
                                            Text(
                                                "Available: ${p.displayStock}  |  Category: ${p.categoryId ?: "—"}",
                                                color = TextMuted, fontSize = 12.sp
                                            )
                                        }
                                    },
                                    onClick = { selectedProduct = p; productExpanded = false }
                                )
                            }
                        }
                    }
                }

                // Quantity
                Text("Quantity to Transfer", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                OutlinedTextField(
                    value = qty,
                    onValueChange = { qty = it.filter { c -> c.isDigit() } },
                    label = { Text("Quantity") },
                    placeholder = { Text("e.g. 50") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = TextFieldDefaults.outlinedTextFieldColors(
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = Border
                    ),
                    // show available stock hint
                    supportingText = selectedProduct?.let {
                        { Text("Max available: ${it.displayStock}", color = TextMuted, fontSize = 12.sp) }
                    }
                )

                // Destination branch dropdown
                Text("Destination Branch", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                ExposedDropdownMenuBox(expanded = branchExpanded, onExpandedChange = { branchExpanded = it }) {
                    OutlinedTextField(
                        value = selectedBranch?.second ?: "Select branch...",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(branchExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        shape = RoundedCornerShape(8.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = Border
                        )
                    )
                    ExposedDropdownMenu(expanded = branchExpanded, onDismissRequest = { branchExpanded = false }) {
                        if (branches.isEmpty()) {
                            DropdownMenuItem(text = { Text("No branches available", color = TextMuted) }, onClick = {})
                        } else {
                            branches.forEach { b ->
                                DropdownMenuItem(
                                    text = { Text(b.second, color = TextPrimary) },
                                    onClick = { selectedBranch = b; branchExpanded = false }
                                )
                            }
                        }
                    }
                }

                HorizontalDivider(color = Border)

                // Buttons
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f).height(50.dp),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderStrong)
                    ) { Text("Cancel", color = TextPrimary) }

                    Button(
                        onClick = {
                            error = ""
                            val product = selectedProduct
                            val qtyInt = qty.toIntOrNull() ?: 0
                            val branch = selectedBranch

                            if (product == null) { error = "Please select a product."; return@Button }
                            if (qtyInt <= 0) { error = "Enter a valid quantity (> 0)."; return@Button }
                            if (qtyInt > product.displayStock) { error = "Quantity exceeds available stock (${product.displayStock})."; return@Button }
                            if (branch == null) { error = "Please select a destination branch."; return@Button }

                            onSubmit(product.id, product.name, qtyInt, branch.first, branch.second)
                        },
                        modifier = Modifier.weight(2f).height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Send, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Submit Request", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

private fun transferStatusColor(status: String): Pair<Color, Color> = when (status) {
    "Pending"    -> Pair(Color(0xFFF59E0B), Color(0xFFFEF3C7))
    "Approved"   -> Pair(Color(0xFF3B82F6), Color(0xFFDBEAFE))
    "In-Transit" -> Pair(Color(0xFF8B5CF6), Color(0xFFEDE9FE))
    "Received"   -> Pair(Color(0xFF10B981), Color(0xFFD1FAE5))
    "Cancelled"  -> Pair(Color(0xFFEF4444), Color(0xFFFEE2E2))
    else         -> Pair(Color(0xFF64748B), Color(0xFFF1F5F9))
}

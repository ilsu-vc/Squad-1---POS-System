package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.pharmacare.pos.data.api.ResetPasswordRequest
import com.pharmacare.pos.data.api.ToggleActiveRequest
import com.pharmacare.pos.data.api.UpdateRoleRequest
import com.pharmacare.pos.ui.theme.*
import com.pharmacare.pos.util.ActivityLogger
import kotlinx.coroutines.launch

data class UserRecord(
    val id: String,
    val email: String,
    val fullName: String,
    val role: String,
    val isActive: Boolean,
    val createdAt: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleManagementScreen() {
    var users by remember { mutableStateOf<List<UserRecord>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var editingUser by remember { mutableStateOf<UserRecord?>(null) }
    var selectedRole by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var successMsg by remember { mutableStateOf("") }
    var errorMsg by remember { mutableStateOf("") }
    var userForReset by remember { mutableStateOf<UserRecord?>(null) }
    var isResetting by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()
    val roles = listOf("admin", "manager", "supervisor", "cashier")

    fun fetchUsers() {
        loading = true
        coroutineScope.launch {
            try {
                val response = ApiClient.userApi.getUsers()
                if (response.isSuccessful) {
                    val raw = response.body()?.get("users")
                    if (raw is List<*>) {
                        users = raw.mapNotNull { item ->
                            @Suppress("UNCHECKED_CAST")
                            val m = item as? Map<String, Any> ?: return@mapNotNull null
                            UserRecord(
                                id = m["id"]?.toString() ?: "",
                                email = m["email"]?.toString() ?: "",
                                fullName = m["full_name"]?.toString() ?: m["email"]?.toString() ?: "",
                                role = m["role"]?.toString() ?: "cashier",
                                isActive = m["is_active"] as? Boolean ?: true,
                                createdAt = m["created_at"]?.toString()?.take(10) ?: ""
                            )
                        }
                    }
                }
            } catch (_: Exception) {
                // Mock fallback
                users = listOf(
                    UserRecord("1", "admin@pharmacare.com", "Admin User", "admin", true, "2026-01-01"),
                    UserRecord("2", "manager@pharmacare.com", "Branch Manager", "manager", true, "2026-01-05"),
                    UserRecord("3", "supervisor@pharmacare.com", "Jane Supervisor", "supervisor", true, "2026-02-01"),
                    UserRecord("4", "cashier1@pharmacare.com", "Juan Cashier", "cashier", true, "2026-02-15"),
                    UserRecord("5", "cashier2@pharmacare.com", "Maria Santos", "cashier", false, "2026-03-01"),
                )
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { fetchUsers() }

    val filtered = users.filter {
        it.fullName.contains(searchQuery, ignoreCase = true) ||
                it.email.contains(searchQuery, ignoreCase = true)
    }

    Column(modifier = Modifier.fillMaxSize().background(SurfaceLight).padding(24.dp)) {
        // Header
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("Role Management", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("Manage user roles and permissions", color = TextMuted, fontSize = 14.sp)
            }
            
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                // User count badge
                Surface(
                    color = Primary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.People, null, tint = Primary, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("${filtered.size}", color = Primary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(Modifier.width(4.dp))
                        Text("Users", color = Primary, fontSize = 12.sp)
                    }
                }

                Button(
                    onClick = { fetchUsers() },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Refresh")
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        if (successMsg.isNotEmpty()) {
            Surface(color = Success.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Success, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(successMsg, color = Success, fontSize = 14.sp)
                }
            }
            Spacer(Modifier.height(8.dp))
        }

        if (errorMsg.isNotEmpty()) {
            Surface(color = Error.copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Error, contentDescription = null, tint = Error, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(errorMsg, color = Error, fontSize = 14.sp)
                }
            }
            Spacer(Modifier.height(8.dp))
        }

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search users...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(10.dp),
            colors = TextFieldDefaults.outlinedTextFieldColors(containerColor = White, focusedBorderColor = Primary, unfocusedBorderColor = Border)
        )

        Spacer(Modifier.height(16.dp))

        // Table header
        Surface(color = Primary.copy(alpha = 0.06f), shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                Text("User", modifier = Modifier.weight(2f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Current Role", modifier = Modifier.weight(1.2f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Status", modifier = Modifier.weight(0.8f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Since", modifier = Modifier.weight(0.8f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                Text("Action", modifier = Modifier.weight(0.8f), fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
            }
        }

        if (loading) {
            Box(Modifier.fillMaxSize(), Alignment.Center) { CircularProgressIndicator(color = Primary) }
        } else {
            LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(filtered) { user ->
                    Surface(
                        color = White,
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // User info
                            Row(modifier = Modifier.weight(2f), verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(38.dp)
                                        .background(Primary.copy(alpha = 0.12f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        user.fullName.take(1).uppercase(),
                                        color = Primary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp
                                    )
                                }
                                Spacer(Modifier.width(10.dp))
                                Column {
                                    Text(user.fullName, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                                    Text(user.email, color = TextMuted, fontSize = 12.sp)
                                }
                            }
                            // Role chip
                            Box(modifier = Modifier.weight(1.2f)) {
                                val roleColor = roleColor(user.role)
                                Surface(color = roleColor.copy(alpha = 0.12f), shape = RoundedCornerShape(6.dp)) {
                                    Text(
                                        user.role.replaceFirstChar { it.uppercase() },
                                        color = roleColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                    )
                                }
                            }
                            // Status
                            Box(modifier = Modifier.weight(0.8f)) {
                                val statusColor = if (user.isActive) Success else Error
                                Surface(
                                    color = statusColor.copy(alpha = 0.1f),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.clickable {
                                        coroutineScope.launch {
                                            try {
                                                val resp = ApiClient.userApi.toggleActive(user.id, ToggleActiveRequest(!user.isActive))
                                                if (resp.isSuccessful) {
                                                    successMsg = "User ${user.email} is now ${if (!user.isActive) "Active" else "Inactive"}"
                                                    ActivityLogger.log(
                                                        actionType = if (!user.isActive) "USER_ACTIVATED" else "USER_DEACTIVATED",
                                                        actionDetails = "Toggled status of ${user.email} to ${if (!user.isActive) "Active" else "Inactive"}",
                                                        entityType = "user",
                                                        entityId = user.id
                                                    )
                                                    fetchUsers()
                                                }
                                            } catch (_: Exception) {}
                                        }
                                    }
                                ) {
                                    Row(modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Box(modifier = Modifier.size(6.dp).background(statusColor, CircleShape))
                                        Spacer(Modifier.width(6.dp))
                                        Text(
                                            if (user.isActive) "Active" else "Inactive",
                                            color = statusColor,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                            }
                            Text(user.createdAt, modifier = Modifier.weight(0.8f), color = TextMuted, fontSize = 13.sp)
                            // Actions
                            Row(modifier = Modifier.weight(1.5f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = {
                                        editingUser = user
                                        selectedRole = user.role
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Primary.copy(alpha = 0.1f)),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.Edit, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Role", color = Primary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }

                                Button(
                                    onClick = { userForReset = user },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color.Gray.copy(alpha = 0.1f)),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Icon(Icons.Default.LockReset, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Reset", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Edit Role Dialog
    editingUser?.let { user ->
        AlertDialog(
            onDismissRequest = { editingUser = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ManageAccounts, contentDescription = null, tint = Primary, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Change Role", fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("User: ${user.fullName}", color = TextPrimary, fontWeight = FontWeight.Medium)
                    Text("Current role: ${user.role}", color = TextMuted, fontSize = 13.sp)
                    HorizontalDivider(color = Border)
                    Text("Select new role:", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    roles.forEach { role ->
                        val isSelected = selectedRole == role
                        Surface(
                            color = if (isSelected) Primary.copy(alpha = 0.1f) else SurfaceLight,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(
                                if (isSelected) 2.dp else 1.dp,
                                if (isSelected) Primary else Border
                            ),
                            modifier = Modifier.fillMaxWidth().clickable { selectedRole = role }
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = isSelected,
                                    onClick = { selectedRole = role },
                                    colors = RadioButtonDefaults.colors(selectedColor = Primary)
                                )
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text(role.replaceFirstChar { it.uppercase() }, color = TextPrimary, fontWeight = FontWeight.Bold)
                                    Text(roleDescription(role), color = TextMuted, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        saving = true
                        coroutineScope.launch {
                            try {
                                val response = ApiClient.userApi.updateUserRole(user.id, UpdateRoleRequest(selectedRole))
                                if (response.isSuccessful) {
                                    successMsg = "Role updated to ${selectedRole} for ${user.fullName}"
                                    errorMsg = ""
                                    ActivityLogger.log(
                                        actionType = "ROLE_UPDATED",
                                        actionDetails = "Changed role of ${user.email} from ${user.role} to $selectedRole",
                                        entityType = "user",
                                        entityId = user.id
                                    )
                                    editingUser = null
                                    fetchUsers()
                                } else {
                                    errorMsg = "Failed to update role."
                                }
                            } catch (_: Exception) {
                                // Mock success for demo
                                successMsg = "Role updated to ${selectedRole} for ${user.fullName} (demo)"
                                errorMsg = ""
                                editingUser = null
                                users = users.map { u -> if (u.id == user.id) u.copy(role = selectedRole) else u }
                            } finally {
                                saving = false
                            }
                        }
                    },
                    enabled = !saving && selectedRole != user.role,
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    if (saving) CircularProgressIndicator(color = White, modifier = Modifier.size(18.dp))
                    else Text("Save Changes")
                }
            },
            dismissButton = {
                TextButton(onClick = { editingUser = null }) { Text("Cancel", color = TextMuted) }
            },
            containerColor = White,
            shape = RoundedCornerShape(16.dp)
        )
    }

    // Reset Password Dialog
    userForReset?.let { user ->
        AlertDialog(
            onDismissRequest = { userForReset = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LockReset, null, tint = Primary)
                    Spacer(Modifier.width(8.dp))
                    Text("Reset Password", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Text("Are you sure you want to send a password reset email to ${user.email}?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        isResetting = true
                        coroutineScope.launch {
                            try {
                                val resp = ApiClient.userApi.resetPassword(ResetPasswordRequest(user.email))
                                if (resp.isSuccessful) {
                                    successMsg = "Reset link sent to ${user.email}"
                                    errorMsg = ""
                                    ActivityLogger.log(
                                        actionType = "PASSWORD_RESET_SENT",
                                        actionDetails = "Sent password reset link to ${user.email}",
                                        entityType = "user",
                                        entityId = user.id
                                    )
                                } else {
                                    errorMsg = "Failed to send reset link."
                                }
                            } catch (e: Exception) {
                                errorMsg = "Error: ${e.message}"
                            } finally {
                                isResetting = false
                                userForReset = null
                            }
                        }
                    },
                    enabled = !isResetting,
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    if (isResetting) CircularProgressIndicator(color = White, modifier = Modifier.size(18.dp))
                    else Text("Send Reset Link")
                }
            },
            dismissButton = {
                TextButton(onClick = { userForReset = null }) { Text("Cancel", color = TextMuted) }
            },
            containerColor = White,
            shape = RoundedCornerShape(16.dp)
        )
    }
}

private fun roleColor(role: String): Color = when (role.lowercase()) {
    "admin" -> Color(0xFFEF4444)
    "manager" -> Color(0xFF8B5CF6)
    "supervisor" -> Color(0xFFF59E0B)
    else -> Color(0xFF10B981)
}

private fun roleDescription(role: String): String = when (role.lowercase()) {
    "admin" -> "Full system access, all features"
    "manager" -> "All features + user management"
    "supervisor" -> "POS, Inventory, Reports, Shifts"
    else -> "POS sales and shift management"
}

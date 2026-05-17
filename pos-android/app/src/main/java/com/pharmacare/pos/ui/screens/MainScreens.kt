package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth

@Composable
fun ManagerScreen(onLogout: () -> Unit) {
    var userEmail by remember { mutableStateOf("Loading...") }
    var userRole by remember { mutableStateOf("") }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val user = SupabaseManager.client.auth.currentUserOrNull()
        userEmail = user?.email ?: "Unknown"
        userRole = SupabaseManager.getUserRole()
    }

    Column(
        modifier = Modifier.fillMaxSize().background(SurfaceLight).padding(28.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        Text("My Profile", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Text("Account details and app information", color = TextMuted, fontSize = 14.sp)

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            // User info card
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.weight(1f)) {
                Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.size(64.dp).background(Primary, CircleShape), contentAlignment = Alignment.Center) {
                            Text(userEmail.take(1).uppercase(), color = White, fontWeight = FontWeight.Bold, fontSize = 28.sp)
                        }
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text(userEmail.substringBefore("@").replaceFirstChar { it.uppercase() }, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = TextPrimary)
                            Text(userEmail, color = TextMuted, fontSize = 14.sp)
                            Spacer(Modifier.height(4.dp))
                            Surface(color = Primary.copy(alpha = 0.1f), shape = RoundedCornerShape(6.dp)) {
                                Text(userRole.replaceFirstChar { it.uppercase() }, color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                            }
                        }
                    }
                    HorizontalDivider(color = Border)
                    listOf(
                        Pair(Icons.Default.Email, userEmail),
                        Pair(Icons.Default.Badge, "Role: ${userRole.replaceFirstChar { it.uppercase() }}"),
                        Pair(Icons.Default.PhoneAndroid, "PharmaCare POS Tablet v1.0.0")
                    ).forEach { (icon, text) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(icon, contentDescription = null, tint = TextMuted, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(text, color = TextSecondary, fontSize = 14.sp)
                        }
                    }
                    HorizontalDivider(color = Border)
                    Button(
                        onClick = onLogout,
                        colors = ButtonDefaults.buttonColors(containerColor = Error.copy(alpha = 0.12f)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Icon(Icons.Default.Logout, contentDescription = null, tint = Error, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Sign Out", color = Error, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // App info card
            Surface(color = White, shape = RoundedCornerShape(16.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Border), modifier = Modifier.weight(1f)) {
                Column(modifier = Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text("System Information", fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 16.sp)
                    HorizontalDivider(color = Border)
                    listOf(
                        Triple("App", "PharmaCare POS", Icons.Default.Apps),
                        Triple("Version", "1.0.0 (Tablet Edition)", Icons.Default.Info),
                        Triple("Platform", "Android Kotlin + Compose", Icons.Default.PhoneAndroid),
                        Triple("Team", "Squad-1 POS System", Icons.Default.Group),
                        Triple("Backend", "NestJS Microservices", Icons.Default.Cloud),
                        Triple("Database", "Supabase (PostgreSQL)", Icons.Default.Storage),
                    ).forEach { (label, value, icon) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(32.dp).background(Primary.copy(alpha = 0.08f), RoundedCornerShape(6.dp)), contentAlignment = Alignment.Center) {
                                Icon(icon, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                            }
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(label, color = TextMuted, fontSize = 11.sp)
                                Text(value, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }
        }
    }
}

// Kept for nav compatibility
@Composable
fun CustomersScreen() {
    Box(modifier = Modifier.fillMaxSize().background(SurfaceLight), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Person, contentDescription = null, tint = TextMuted, modifier = Modifier.size(64.dp))
            Spacer(Modifier.height(12.dp))
            Text("Customer management coming soon.", color = TextMuted, fontSize = 16.sp)
        }
    }
}

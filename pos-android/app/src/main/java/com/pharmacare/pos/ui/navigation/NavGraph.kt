package com.pharmacare.pos.ui.navigation

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.MenuOpen
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.*
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.components.ChangePasswordDialog
import com.pharmacare.pos.ui.screens.*
import com.pharmacare.pos.ui.theme.*
import com.pharmacare.pos.util.ActivityLogger
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.launch

sealed class Screen(val route: String, val title: String, val icon: ImageVector, val unselectedIcon: ImageVector) {
    object Dashboard   : Screen("dashboard",   "Dashboard",       Icons.Filled.Dashboard,      Icons.Outlined.Dashboard)
    object Transaction : Screen("transaction", "POS",             Icons.Filled.ShoppingCart,   Icons.Outlined.ShoppingCart)
    object History     : Screen("history",     "History",         Icons.Filled.Receipt,        Icons.Outlined.Receipt)
    object Inventory   : Screen("inventory",   "Inventory",       Icons.Filled.Inventory,      Icons.Outlined.Inventory)
    object Shift       : Screen("shift",       "Shift",           Icons.Filled.Schedule,       Icons.Outlined.Schedule)
    object Reports     : Screen("reports",     "Reports",         Icons.Filled.BarChart,       Icons.Outlined.BarChart)
    object Manager     : Screen("manager",     "Profile",         Icons.Filled.Person,         Icons.Outlined.Person)
    object Activity    : Screen("activity",    "Activity Log",    Icons.Filled.History,        Icons.Outlined.History)
    object ShiftReports: Screen("shift_reports","Shift Reports",  Icons.Filled.Assignment,     Icons.Outlined.Assignment)
    object Transfers   : Screen("transfers",   "Transfers",       Icons.Filled.SwapHoriz,      Icons.Outlined.SwapHoriz)
    object Roles       : Screen("roles",       "Role Management", Icons.Filled.ManageAccounts, Icons.Outlined.ManageAccounts)
}

val allNavItems = listOf(
    Screen.Dashboard, Screen.Transaction, Screen.History,
    Screen.Inventory, Screen.Shift, Screen.Reports,
    Screen.Activity, Screen.ShiftReports
)

fun visibleScreens(role: String): List<Screen> = when (role.trim().lowercase()) {
    "admin"      -> allNavItems + Screen.Roles
    "manager"    -> allNavItems
    "supervisor" -> listOf(Screen.Dashboard, Screen.Transaction, Screen.History, Screen.Inventory, Screen.Shift, Screen.Reports)
    else         -> listOf(Screen.Transaction, Screen.Shift)
}

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    var isAuthenticated by remember { mutableStateOf(SupabaseManager.client.auth.currentSessionOrNull() != null) }
    var userRole by remember { mutableStateOf("cashier") }
    var isCheckingAuth by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        if (isAuthenticated) userRole = SupabaseManager.getUserRole()
        isCheckingAuth = false
    }

    if (isCheckingAuth) { LoadingScreen(); return }

    if (!isAuthenticated) {
        AuthNavGraph(onAuthSuccess = {
            isAuthenticated = true
            userRole = SupabaseManager.getUserRole()
        })
    } else {
        MainAppScreen(navController, userRole) {
            isAuthenticated = false
            userRole = "cashier"
        }
    }
}

@Composable
fun AuthNavGraph(onAuthSuccess: () -> Unit) {
    val authNav = rememberNavController()
    NavHost(navController = authNav, startDestination = "login") {
        composable("login") { LoginScreen(onNavigateToPin = { authNav.navigate("pin") }, onLoginSuccess = onAuthSuccess) }
        composable("pin")   { PINScreen(onLoginSuccess = onAuthSuccess, onBackToLogin = { authNav.popBackStack() }) }
    }
}

@Composable
fun MainAppScreen(navController: NavHostController, userRole: String, onLogout: () -> Unit) {
    val screens = visibleScreens(userRole)
    val navBackStack by navController.currentBackStackEntryAsState()
    val currentDest = navBackStack?.destination

    var drawerOpen by remember { mutableStateOf(true) }
    val drawerWidth by animateDpAsState(targetValue = if (drawerOpen) 260.dp else 72.dp, label = "drawer")

    var userEmail by remember { mutableStateOf("") }
    var showChangePassword by remember { mutableStateOf(false) }
    var showPrinterSettings by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        userEmail = SupabaseManager.client.auth.currentUserOrNull()?.email ?: ""
    }

    val currentTitle = (screens + listOf(Screen.Roles)).find { it.route == currentDest?.route }?.title ?: "POS"

    var showUserMenu by remember { mutableStateOf(false) }

    Row(modifier = Modifier.fillMaxSize()) {

        // ── Collapsible Sidebar ─────────────────────────────────────────────
        Box(
            modifier = Modifier
                .width(drawerWidth)
                .fillMaxHeight()
                .background(Background)
        ) {
            Column(modifier = Modifier.fillMaxSize().padding(vertical = 16.dp)) {
                // Hamburger + brand row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(10.dp))
                            .background(White.copy(alpha = 0.08f))
                            .clickable { drawerOpen = !drawerOpen },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (drawerOpen) Icons.AutoMirrored.Filled.MenuOpen else Icons.Default.Menu,
                            contentDescription = "Toggle menu",
                            tint = White,
                            modifier = Modifier.size(22.dp)
                        )
                    }

                    if (drawerOpen) {
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("PHARMACARE", color = White, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
                            Text("POS Terminal", color = White.copy(alpha = 0.45f), fontSize = 10.sp)
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))
                HorizontalDivider(color = White.copy(alpha = 0.1f), modifier = Modifier.padding(horizontal = 14.dp))
                Spacer(Modifier.height(8.dp))

                // Nav items
                Column(modifier = Modifier.weight(1f).verticalScroll(rememberScrollState())) {
                    screens.forEach { screen ->
                        val isSelected = currentDest?.hierarchy?.any { it.route == screen.route } == true
                        val itemBg = if (isSelected) Primary.copy(alpha = 0.18f) else Color.Transparent
                        val iconTint = if (isSelected) Primary else White.copy(alpha = 0.55f)
                        val textColor = if (isSelected) Primary else White.copy(alpha = 0.55f)

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 10.dp, vertical = 2.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(itemBg)
                                .clickable {
                                    navController.navigate(screen.route) {
                                        popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                                .height(50.dp)
                                .padding(horizontal = 14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = if (isSelected) screen.icon else screen.unselectedIcon,
                                contentDescription = screen.title,
                                tint = iconTint,
                                modifier = Modifier.size(22.dp)
                            )
                            if (drawerOpen) {
                                Spacer(Modifier.width(12.dp))
                                Text(
                                    screen.title,
                                    color = textColor,
                                    fontSize = 14.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }

                HorizontalDivider(color = White.copy(alpha = 0.1f), modifier = Modifier.padding(horizontal = 14.dp))
                Spacer(Modifier.height(8.dp))

                // Removed User avatar block as requested by user
                Spacer(Modifier.height(8.dp))
            }
        }

        // ── Vertical Separation ──
        VerticalDivider(color = Color(0xFF2E3E5C).copy(alpha = 0.3f), thickness = 1.dp)

        // ── Main Content Area ───────────────────────────────────────────────
        Column(modifier = Modifier.weight(1f).fillMaxHeight().padding(start = 2.dp)) {

            // Top bar
            Surface(
                color = Background,
                modifier = Modifier.fillMaxWidth().height(64.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF2E3E5C).copy(alpha = 0.4f))
            ) {
                Row(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(currentTitle, color = White, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        // Online badge
                        Surface(color = White.copy(alpha = 0.08f), shape = RoundedCornerShape(8.dp)) {
                            Row(modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(8.dp).background(Success, CircleShape))
                                Spacer(Modifier.width(6.dp))
                                Text("Online", color = Success, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                        // Role badge
                        Surface(color = Primary.copy(alpha = 0.15f), shape = RoundedCornerShape(8.dp)) {
                            Text(
                                userRole.replaceFirstChar { it.uppercase() },
                                color = Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }

                        // ── Printer Settings ─────────────────────────────
                        IconButton(onClick = { showPrinterSettings = true }) {
                            Icon(Icons.Default.Settings, contentDescription = "Printer Settings", tint = White.copy(alpha = 0.7f))
                        }

                        // ── User avatar dropdown ─────────────────────────
                        Box {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(Primary)
                                    .clickable { showUserMenu = true },
                                contentAlignment = Alignment.Center
                            ) {
                                Text(userEmail.take(1).uppercase(), color = White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }

                            DropdownMenu(
                                expanded = showUserMenu,
                                onDismissRequest = { showUserMenu = false },
                                modifier = Modifier.background(White)
                            ) {
                                // User info header
                                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                                    Text(
                                        userEmail.substringBefore("@").replaceFirstChar { it.uppercase() },
                                        fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp
                                    )
                                    Text(userEmail, color = TextMuted, fontSize = 12.sp)
                                    Spacer(Modifier.height(4.dp))
                                    Surface(color = Primary.copy(alpha = 0.1f), shape = RoundedCornerShape(6.dp)) {
                                        Text(
                                            userRole.replaceFirstChar { it.uppercase() },
                                            color = Primary, fontWeight = FontWeight.Bold, fontSize = 11.sp,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                                        )
                                    }
                                }

                                HorizontalDivider(color = Border)

                                // Profile
                                DropdownMenuItem(
                                    text = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Person, null, tint = TextPrimary, modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(10.dp))
                                            Text("Profile", color = TextPrimary, fontSize = 14.sp)
                                        }
                                    },
                                    onClick = {
                                        showUserMenu = false
                                        navController.navigate(Screen.Manager.route) {
                                            launchSingleTop = true
                                        }
                                    }
                                )

                                // Change Password
                                DropdownMenuItem(
                                    text = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Key, null, tint = TextPrimary, modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(10.dp))
                                            Text("Change Password", color = TextPrimary, fontSize = 14.sp)
                                        }
                                    },
                                    onClick = {
                                        showUserMenu = false
                                        showChangePassword = true
                                    }
                                )

                                HorizontalDivider(color = Border)

                                // Sign Out
                                DropdownMenuItem(
                                    text = {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.AutoMirrored.Filled.ExitToApp, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(10.dp))
                                            Text("Sign Out", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        }
                                    },
                                    onClick = {
                                        showUserMenu = false
                                        coroutineScope.launch {
                                            ActivityLogger.log(
                                                actionType = "LOGOUT",
                                                actionDetails = "User logged out: $userEmail",
                                                entityType = "user",
                                                entityId = SupabaseManager.client.auth.currentUserOrNull()?.id
                                            )
                                            try { SupabaseManager.client.auth.signOut() } catch (_: Exception) {}
                                            onLogout()
                                        }
                                    }
                                )
                            }
                        }
                        // ────────────────────────────────────────────────
                    }
                }
            }

            Box(modifier = Modifier.fillMaxSize()) {
                val startDest = if (userRole.trim().lowercase() == "cashier") Screen.Transaction.route else Screen.Dashboard.route
                NavHost(navController = navController, startDestination = startDest) {
                    composable(Screen.Dashboard.route)   { DashboardScreen() }
                    composable(Screen.Transaction.route) { POSScreen(navController) }
                    composable(Screen.History.route)     { TransactionHistoryScreen() }
                    composable(Screen.Inventory.route)   { InventoryManagementScreen() }
                    composable(Screen.Shift.route)       { ShiftScreen() }
                    composable(Screen.Reports.route)     { ReportsAndAnalysisScreen() }
                    composable(Screen.Manager.route)     { ManagerScreen(onLogout) }
                    composable(Screen.Activity.route)    { ActivityLogScreen() }
                    composable(Screen.ShiftReports.route){ ShiftReportsScreen() }
                    composable(Screen.Transfers.route)   { BranchTransferScreen() }
                    composable(Screen.Roles.route)       { RoleManagementScreen() }
                    composable("hold_list")              { HoldListScreen(navController) }
                    composable("refund")                 { RefundScreen(navController) }
                    composable("customer_register")      { CustomerRegisterScreen(navController) }
                }
            }
        }
    }

    if (showChangePassword) {
        ChangePasswordDialog(onDismiss = { showChangePassword = false })
    }

    if (showPrinterSettings) {
        com.pharmacare.pos.ui.components.PrinterSettingsDialog(onDismiss = { showPrinterSettings = false })
    }
}


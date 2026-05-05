package com.pharmacare.pos.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.screens.*
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth

sealed class Screen(val route: String, val title: String, val icon: ImageVector, val unselectedIcon: ImageVector) {
    object Transaction : Screen("transaction", "Transaction", Icons.Filled.ShoppingCart, Icons.Outlined.ShoppingCart)
    object Customers : Screen("customers", "Customers", Icons.Filled.People, Icons.Outlined.People)
    object Shift : Screen("shift", "Shift", Icons.Filled.Schedule, Icons.Outlined.Schedule)
    object Reports : Screen("reports", "Reports", Icons.Filled.BarChart, Icons.Outlined.BarChart)
    object Admin : Screen("admin", "Admin", Icons.Filled.Security, Icons.Outlined.Security)
}

val bottomNavigationItems = listOf(
    Screen.Transaction,
    Screen.Customers,
    Screen.Shift,
    Screen.Reports,
    Screen.Admin
)

@Composable
fun NavGraph() {
    val navController = rememberNavController()
    var isAuthenticated by remember { mutableStateOf(false) }
    var userRole by remember { mutableStateOf("cashier") }
    var isCheckingAuth by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        val session = SupabaseManager.client.auth.currentSessionOrNull()
        isAuthenticated = session != null
        
        // Simulating getting the role for now. 
        // In reality, we'd fetch from Supabase metadata or API.
        userRole = "manager" 
        
        isCheckingAuth = false
    }

    if (isCheckingAuth) {
        LoadingScreen()
        return
    }

    if (!isAuthenticated) {
        AuthNavGraph(
            onAuthSuccess = { 
                isAuthenticated = true
                // In real app, fetch role here too
            }
        )
    } else {
        MainAppScreen(navController, userRole) {
            isAuthenticated = false
        }
    }
}

@Composable
fun AuthNavGraph(onAuthSuccess: () -> Unit) {
    val authNavController = rememberNavController()
    NavHost(navController = authNavController, startDestination = "login") {
        composable("login") { 
            LoginScreen(
                onNavigateToPin = { authNavController.navigate("pin") },
                onLoginSuccess = onAuthSuccess
            ) 
        }
        composable("pin") { PINScreen(onLoginSuccess = onAuthSuccess, onBackToLogin = { authNavController.popBackStack() }) }
    }
}

@Composable
fun MainAppScreen(navController: NavHostController, userRole: String, onLogout: () -> Unit) {
    val isManager = userRole == "manager" || userRole == "admin" || userRole == "superadmin"

    Scaffold(
        bottomBar = {
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = navBackStackEntry?.destination
            
            // Only show bottom bar on main tab screens
            val isMainTab = bottomNavigationItems.any { it.route == currentDestination?.route }

            if (isMainTab) {
                NavigationBar(
                    containerColor = Surface,
                    contentColor = Primary
                ) {
                    bottomNavigationItems.forEach { screen ->
                        // Hide admin tab if not manager
                        if (screen == Screen.Admin && !isManager) return@forEach

                        val isSelected = currentDestination?.hierarchy?.any { it.route == screen.route } == true
                        NavigationBarItem(
                            icon = { Icon(if (isSelected) screen.icon else screen.unselectedIcon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = isSelected,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Primary,
                                selectedTextColor = Primary,
                                unselectedIconColor = TextMuted,
                                unselectedTextColor = TextMuted,
                                indicatorColor = Color.Transparent
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Transaction.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Transaction.route) { POSScreen(navController) }
            composable(Screen.Customers.route) { CustomersScreen() }
            composable(Screen.Shift.route) { ShiftScreen() }
            composable(Screen.Reports.route) { ReportsScreen() }
            composable(Screen.Admin.route) { ManagerScreen(onLogout) }
            
            // Transaction Sub-screens
            composable("hold_list") { HoldListScreen(navController) }
            composable("refund") { RefundScreen(navController) }
            composable("customer_register") { CustomerRegisterScreen(navController) }
        }
    }
}

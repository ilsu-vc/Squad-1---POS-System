package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import com.pharmacare.pos.ui.theme.*

@Composable
fun HoldListScreen(navController: NavHostController) {
    Box(modifier = Modifier.fillMaxSize().background(Background), contentAlignment = Alignment.Center) {
        Text("Hold List Placeholder", color = TextPrimary)
    }
}

@Composable
fun RefundScreen(navController: NavHostController) {
    Box(modifier = Modifier.fillMaxSize().background(Background), contentAlignment = Alignment.Center) {
        Text("Refund Placeholder", color = TextPrimary)
    }
}

@Composable
fun CustomerRegisterScreen(navController: NavHostController) {
    Box(modifier = Modifier.fillMaxSize().background(Background), contentAlignment = Alignment.Center) {
        Text("Customer Register Placeholder", color = TextPrimary)
    }
}

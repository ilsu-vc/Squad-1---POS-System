package com.pharmacare.pos.ui.screens

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.data.auth.SupabaseManager
import com.pharmacare.pos.ui.theme.*
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PINScreen(onLoginSuccess: () -> Unit, onBackToLogin: () -> Unit) {
    var pin by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    fun vibrate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            val vibrator = vibratorManager.defaultVibrator
            vibrator.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            vibrator.vibrate(200)
        }
    }

    Row(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
    ) {
        // Left Branding Panel
        Box(
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight()
                .background(Surface)
                .border(1.dp, Border, shape = RoundedCornerShape(0.dp)),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(90.dp)
                        .background(Primary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.Favorite,
                        contentDescription = "Logo",
                        tint = White,
                        modifier = Modifier.size(45.dp)
                    )
                }
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "PharmaCare",
                    color = TextPrimary,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "Quick PIN Access",
                    color = Primary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }

        // Right PIN Panel
        Box(
            modifier = Modifier
                .weight(0.65f)
                .fillMaxHeight(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier.width(380.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Enter PIN",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 24.dp)
                )

                // PIN Dots
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.padding(bottom = 32.dp)
                ) {
                    for (i in 0 until 4) {
                        val isFilled = i < pin.length
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .background(if (isFilled) Primary else SurfaceLight, CircleShape)
                                .border(2.dp, if (isFilled) PrimaryDark else Border, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isFilled) {
                                Icon(Icons.Filled.Lock, contentDescription = null, tint = White, modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                }

                // Error Message
                if (error.isNotEmpty()) {
                    Surface(
                        color = Error.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 20.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Icon(Icons.Filled.Warning, contentDescription = null, tint = Error, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(text = error, color = Error, fontSize = 14.sp)
                        }
                    }
                }

                // Keypad
                val keys = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "DEL")
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(bottom = 32.dp)
                ) {
                    items(keys) { key ->
                        val isAction = key == "C" || key == "DEL"
                        Surface(
                            color = if (isAction) SurfaceHover else SurfaceLight,
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
                            modifier = Modifier
                                .height(64.dp)
                                .clickable(enabled = !loading) {
                                    error = ""
                                    when (key) {
                                        "C" -> pin = ""
                                        "DEL" -> if (pin.isNotEmpty()) pin = pin.dropLast(1)
                                        else -> if (pin.length < 4) pin += key
                                    }
                                }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                if (key == "DEL") {
                                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Backspace", tint = TextPrimary)
                                } else {
                                    Text(
                                        text = key,
                                        color = if (isAction) TextSecondary else TextPrimary,
                                        fontSize = if (isAction) 20.sp else 26.sp,
                                        fontWeight = if (isAction) FontWeight.Normal else FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                // Submit Button
                Button(
                    onClick = {
                        if (pin.length != 4) {
                            error = "PIN must be exactly 4 digits"
                            return@Button
                        }
                        loading = true
                        error = ""
                        coroutineScope.launch {
                            try {
                                SupabaseManager.client.auth.signInWith(Email) {
                                    this.email = "cashier$pin@pos.local"
                                    this.password = pin
                                }
                                onLoginSuccess()
                            } catch (e: Exception) {
                                vibrate()
                                error = "Invalid PIN"
                                pin = ""
                            } finally {
                                loading = false
                            }
                        }
                    },
                    enabled = !loading && pin.length == 4,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    if (loading) {
                        CircularProgressIndicator(color = White, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Sign In", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                TextButton(onClick = onBackToLogin, enabled = !loading) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Back to email login", color = Primary, fontSize = 15.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
    }
}

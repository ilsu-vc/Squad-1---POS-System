package com.pharmacare.pos.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = White,
    primaryContainer = PrimaryLight,
    secondary = Info,
    onSecondary = White,
    background = SurfaceLight,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceHover,
    onSurfaceVariant = TextSecondary,
    error = Error,
    onError = White,
    outline = Border
)

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = White,
    primaryContainer = PrimaryDark,
    secondary = Info,
    onSecondary = White,
    background = Background,
    onBackground = White,
    surface = Background,
    onSurface = White,
    surfaceVariant = Color(0xFF263550),
    onSurfaceVariant = Color(0xFF94A3B8),
    error = Error,
    onError = White,
    outline = Color(0xFF2E3E5C)
)

@Composable
fun PharmaCareTheme(
    darkTheme: Boolean = false, // Set to false by default to match web app
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            // Use Background (Navy) for the status bar to match web navbar
            window.statusBarColor = Background.toArgb()
            window.navigationBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}


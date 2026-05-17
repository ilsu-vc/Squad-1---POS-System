package com.pharmacare.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.pharmacare.pos.ui.navigation.NavGraph
import com.pharmacare.pos.ui.theme.PharmaCareTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request permissions for Bluetooth and Camera
        val permissions = mutableListOf(
            android.Manifest.permission.CAMERA
        )
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permissions.add(android.Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(android.Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            permissions.add(android.Manifest.permission.ACCESS_FINE_LOCATION)
        }
        
        androidx.core.app.ActivityCompat.requestPermissions(
            this,
            permissions.toTypedArray(),
            101
        )

        // Start Print Server automatically on launch
        com.pharmacare.pos.util.PrintService.start(this)

        // Initialize API Client with saved IP if any
        com.pharmacare.pos.data.api.ApiClient.init(this)

        setContent {
            PharmaCareTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NavGraph()
                }
            }
        }
    }
}

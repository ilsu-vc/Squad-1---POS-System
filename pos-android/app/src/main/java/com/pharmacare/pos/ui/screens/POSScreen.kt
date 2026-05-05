package com.pharmacare.pos.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.pharmacare.pos.data.api.ApiClient
import com.pharmacare.pos.data.model.CartItem
import com.pharmacare.pos.data.model.Product
import com.pharmacare.pos.ui.components.BarcodeScannerDialog
import com.pharmacare.pos.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSScreen(navController: NavHostController) {
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var cart by remember { mutableStateOf<List<CartItem>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showScanner by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            val response = ApiClient.productApi.getProducts()
            if (response.isSuccessful) {
                products = response.body()?.products ?: emptyList()
                if (products.isEmpty()) {
                    errorMessage = "No products found in the database."
                }
            } else {
                errorMessage = "Failed to load products: HTTP ${response.code()}"
            }
        } catch (e: Exception) {
            e.printStackTrace()
            errorMessage = "Network Error: ${e.localizedMessage}"
        } finally {
            loading = false
        }
    }

    val filteredProducts = products.filter {
        it.name.contains(searchQuery, ignoreCase = true) || 
        it.sku.contains(searchQuery, ignoreCase = true)
    }

    val subtotal = cart.sumOf { it.finalPrice }
    val tax = subtotal * 0.12
    val total = subtotal + tax

    Row(modifier = Modifier.fillMaxSize().background(Background)) {
        // Left Panel: Product Grid
        Column(
            modifier = Modifier
                .weight(0.65f)
                .fillMaxHeight()
                .padding(16.dp)
        ) {
            // Header & Search
            Row(
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Products",
                    color = TextPrimary,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Button(
                        onClick = { showScanner = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Primary),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Filled.CameraAlt, contentDescription = "Scan")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Scan (Camera)")
                    }
                    
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search products...") },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = TextMuted) },
                        modifier = Modifier.width(300.dp).height(50.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = Border,
                            containerColor = Surface
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                }
            }

            // Products Grid
            if (loading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else if (errorMessage != null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(text = errorMessage!!, color = Error, fontSize = 16.sp)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 180.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(filteredProducts) { product ->
                        ProductCard(product = product, onAdd = {
                            val existing = cart.find { it.product.id == product.id }
                            if (existing != null) {
                                val newCart = cart.toMutableList()
                                val index = newCart.indexOf(existing)
                                newCart[index] = existing.copy(quantity = existing.quantity + 1)
                                cart = newCart
                            } else {
                                cart = cart + CartItem(product, 1)
                            }
                        })
                    }
                }
            }
        }

        // Right Panel: Cart
        Column(
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight()
                .background(Surface)
                .border(1.dp, Border)
        ) {
            // Cart Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .background(SurfaceLight, RoundedCornerShape(8.dp))
                    .border(1.dp, Border, RoundedCornerShape(8.dp))
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Current Order", color = TextSecondary, fontSize = 14.sp)
                    Text("Order #NEW", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                Surface(
                    color = Primary.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text(
                        "${cart.sumOf { it.quantity }} items", 
                        color = Primary, 
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }

            // Cart Items
            if (cart.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Filled.ShoppingCart, contentDescription = null, tint = TextMuted, modifier = Modifier.size(64.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Cart is empty", color = TextMuted, fontSize = 18.sp)
                    }
                }
            } else {
                LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
                    items(cart) { item ->
                        CartItemRow(
                            item = item,
                            onIncrement = {
                                val newCart = cart.toMutableList()
                                val index = newCart.indexOf(item)
                                newCart[index] = item.copy(quantity = item.quantity + 1)
                                cart = newCart
                            },
                            onDecrement = {
                                val newCart = cart.toMutableList()
                                val index = newCart.indexOf(item)
                                if (item.quantity > 1) {
                                    newCart[index] = item.copy(quantity = item.quantity - 1)
                                } else {
                                    newCart.removeAt(index)
                                }
                                cart = newCart
                            },
                            onRemove = {
                                val newCart = cart.toMutableList()
                                newCart.remove(item)
                                cart = newCart
                            }
                        )
                        HorizontalDivider(color = Border)
                    }
                }
            }

            // Cart Summary & Action
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceLight)
                    .border(1.dp, Border)
                    .padding(20.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Subtotal", color = TextSecondary, fontSize = 16.sp)
                    Text("₱${String.format("%.2f", subtotal)}", color = TextPrimary, fontSize = 16.sp)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("VAT (12%)", color = TextSecondary, fontSize = 16.sp)
                    Text("₱${String.format("%.2f", tax)}", color = TextPrimary, fontSize = 16.sp)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total", color = TextPrimary, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text("₱${String.format("%.2f", total)}", color = Primary, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(24.dp))
                
                Button(
                    onClick = { /* TODO: Open Payment Flow */ },
                    enabled = cart.isNotEmpty(),
                    modifier = Modifier.fillMaxWidth().height(60.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Success),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Charge", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = White)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("₱${String.format("%.2f", total)}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(Icons.Filled.ArrowForward, contentDescription = null, tint = White)
                        }
                    }
                }
            }
        }
    }

    if (showScanner) {
        BarcodeScannerDialog(
            onDismiss = { showScanner = false },
            onScanned = { scannedSku ->
                showScanner = false
                val product = products.find { it.sku == scannedSku }
                if (product != null) {
                    val existing = cart.find { it.product.id == product.id }
                    if (existing != null) {
                        val newCart = cart.toMutableList()
                        val index = newCart.indexOf(existing)
                        newCart[index] = existing.copy(quantity = existing.quantity + 1)
                        cart = newCart
                    } else {
                        cart = cart + CartItem(product, 1)
                    }
                    searchQuery = "" // Clear search
                    errorMessage = null // Clear any error
                } else {
                    errorMessage = "Product with SKU '$scannedSku' not found"
                }
            }
        )
    }
}

@Composable
fun ProductCard(product: Product, onAdd: () -> Unit) {
    Surface(
        color = Surface,
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Border),
        modifier = Modifier
            .fillMaxWidth()
            .height(140.dp)
            .clickable { onAdd() }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = product.name,
                    color = TextPrimary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = "Stock: ${product.stock}",
                    color = if (product.stock > 10) TextMuted else Error,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "₱${String.format("%.2f", product.price)}",
                    color = Primary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(Primary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Filled.Add, contentDescription = "Add", tint = White, modifier = Modifier.size(20.dp))
                }
            }
        }
    }
}

@Composable
fun CartItemRow(
    item: CartItem,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    onRemove: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.product.name,
                color = TextPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "₱${String.format("%.2f", item.product.price)}",
                color = TextMuted,
                fontSize = 14.sp,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(SurfaceLight, RoundedCornerShape(20.dp))
                .border(1.dp, Border, RoundedCornerShape(20.dp))
        ) {
            IconButton(onClick = onDecrement, modifier = Modifier.size(36.dp)) {
                Text("-", color = Primary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Text(
                text = item.quantity.toString(),
                color = TextPrimary,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            IconButton(onClick = onIncrement, modifier = Modifier.size(36.dp)) {
                Text("+", color = Primary, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Text(
            text = "₱${String.format("%.2f", item.finalPrice)}",
            color = TextPrimary,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.width(80.dp)
        )
    }
}

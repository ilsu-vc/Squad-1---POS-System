package com.pharmacare.pos.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pharmacare.pos.ui.theme.*

@Composable
fun PieChart(
    data: List<Triple<String, Float, Color>>,
    modifier: Modifier = Modifier,
    size: Float = 160f
) {
    val total = data.sumOf { it.second.toDouble() }.toFloat()
    
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Pie
        Box(modifier = Modifier.size(size.dp), contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                var startAngle = -90f
                data.forEach { (_, value, color) ->
                    val sweepAngle = if (total > 0) (value / total) * 360f else 0f
                    drawArc(
                        color = color,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = true,
                        size = Size(this.size.width, this.size.height)
                    )
                    startAngle += sweepAngle
                }
                
                // Inner white circle for donut effect
                drawCircle(
                    color = White,
                    radius = this.size.width / 4,
                    center = Offset(this.size.width / 2, this.size.height / 2)
                )
            }
        }
        
        // Legend
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            data.forEach { (label, value, color) ->
                val pct = if (total > 0) (value / total * 100).toInt() else 0
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(modifier = Modifier.size(10.dp).background(color, CircleShape))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = label,
                        color = TextPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.width(100.dp)
                    )
                    Text(
                        text = "$pct%",
                        color = color,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun BarChart(
    data: List<Pair<String, Float>>,
    modifier: Modifier = Modifier,
    barColor: Color = Primary,
    height: Float = 200f
) {
    val maxVal = data.maxOfOrNull { it.second }?.takeIf { it > 0f } ?: 1f
    
    Column(modifier = modifier) {
        Canvas(modifier = Modifier.fillMaxWidth().height(height.dp)) {
            val w = size.width
            val h = size.height
            val barWidth = w / (data.size * 1.5f)
            val spacing = (w - (barWidth * data.size)) / (data.size + 1)
            
            data.forEachIndexed { i, (_, value) ->
                val barHeight = (value / maxVal) * h
                val x = spacing + i * (barWidth + spacing)
                val y = h - barHeight
                
                drawRoundRect(
                    color = barColor,
                    topLeft = Offset(x, y),
                    size = Size(barWidth, barHeight),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
                )
            }
        }
        
        Spacer(Modifier.height(8.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            data.forEach { (label, _) ->
                Text(
                    text = label,
                    color = TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun ComposedChart(
    data: List<ChartPoint>,
    modifier: Modifier = Modifier,
    height: Float = 240f
) {
    val maxSales = data.maxOfOrNull { it.sales }?.takeIf { it > 0f } ?: 1f
    val maxCount = data.maxOfOrNull { it.count.toFloat() }?.takeIf { it > 0f } ?: 1f
    
    Column(modifier = modifier) {
        Canvas(modifier = Modifier.fillMaxWidth().height(height.dp)) {
            val w = size.width
            val h = size.height
            val itemCount = data.size
            val barWidth = w / (itemCount * 2f)
            val spacing = (w - (barWidth * itemCount)) / (itemCount + 1)
            
            // Draw Bars (Sales)
            data.forEachIndexed { i, point ->
                val barHeight = (point.sales / maxSales) * h * 0.8f
                val x = spacing + i * (barWidth + spacing)
                val y = h - barHeight
                
                drawRoundRect(
                    color = Background,
                    topLeft = Offset(x, y),
                    size = Size(barWidth, barHeight),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(4f, 4f)
                )
            }
            
            // Draw Line (Count)
            val path = Path()
            data.forEachIndexed { i, point ->
                val x = spacing + i * (barWidth + spacing) + (barWidth / 2)
                val y = h - (point.count.toFloat() / maxCount) * h * 0.8f
                
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            
            drawPath(
                path = path,
                color = Primary,
                style = Stroke(width = 3f)
            )
            
            // Draw Dots (Count)
            data.forEachIndexed { i, point ->
                val x = spacing + i * (barWidth + spacing) + (barWidth / 2)
                val y = h - (point.count.toFloat() / maxCount) * h * 0.8f
                
                drawCircle(color = White, radius = 5f, center = Offset(x, y))
                drawCircle(color = Primary, radius = 3f, center = Offset(x, y))
            }
        }
        
        Spacer(Modifier.height(12.dp))
        
        // Simplified X-Axis Labels (show every 4th or something if too many)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            data.filterIndexed { index, _ -> index % 4 == 0 }.forEach { point ->
                Text(
                    text = point.label,
                    color = TextMuted,
                    fontSize = 10.sp
                )
            }
        }
    }
}

data class ChartPoint(
    val label: String,
    val sales: Float,
    val count: Int
)

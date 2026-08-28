package jp.nichijou.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val PeachBg = Color(0xFFF9ECE7)
val SoftPink = Color(0xFFEF7488)
val SoftPinkLight = Color(0xFFF79AA8)
val Ink = Color(0xFF3A3330)
val Muted = Color(0xFF8A7A72)
val Mist = Color(0xFFB0A099)
val CardWhite = Color(0xFFFFFFFF)
val Cream = Color(0xFFFBF4F1)
val Gold = Color(0xFFE0A93A)

private val NichijouColors = lightColorScheme(
    primary = SoftPink,
    onPrimary = Color.White,
    secondary = SoftPinkLight,
    background = PeachBg,
    surface = CardWhite,
    onBackground = Ink,
    onSurface = Ink,
    outline = Color(0x1A784836),
)

@Composable
fun NichijouTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = NichijouColors,
        content = content,
    )
}

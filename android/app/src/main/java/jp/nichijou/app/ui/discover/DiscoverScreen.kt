package jp.nichijou.app.ui.discover

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import jp.nichijou.app.data.ApiClient
import jp.nichijou.app.data.DiscoverCardDto
import jp.nichijou.app.ui.theme.Cream
import jp.nichijou.app.ui.theme.Ink
import jp.nichijou.app.ui.theme.Mist
import jp.nichijou.app.ui.theme.Muted
import jp.nichijou.app.ui.theme.SoftPink
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun DiscoverScreen(
    onOpenChat: (slug: String) -> Unit,
    onOpenProfile: (slug: String) -> Unit,
) {
    var items by remember { mutableStateOf<List<DiscoverCardDto>>(emptyList()) }
    var category by remember { mutableStateOf("recommend") }
    var gender by remember { mutableStateOf("all") }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        loading = true
        try {
            val res = withContext(Dispatchers.IO) { ApiClient.api.discover() }
            items = res.items
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val filtered = items.filter { card ->
        val genderOk = gender == "all" || card.gender == gender
        val categoryMatch = category == "recommend" || card.category == category
        categoryMatch && genderOk
    }

    Column(modifier = Modifier.fillMaxSize().background(Cream)) {
        Text(
            text = "発見",
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            color = Ink,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            val genders = listOf("all" to "すべて", "female" to "女性", "male" to "男性", "other" to "その他")
            items(genders) { (id, label) ->
                FilterChip(
                    selected = gender == id,
                    onClick = { gender = id },
                    label = { Text(label, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Ink,
                        selectedLabelColor = Color.White,
                    ),
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            val cats = listOf(
                "recommend" to "おすすめ",
                "anime" to "二次元",
                "school" to "学園",
                "romance" to "恋愛",
                "healing" to "癒し",
                "fantasy" to "ファンタジー",
                "game" to "ゲーム",
            )
            items(cats) { (id, label) ->
                FilterChip(
                    selected = category == id,
                    onClick = { category = id },
                    label = { Text(label, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = SoftPink,
                        selectedLabelColor = Color.White,
                    ),
                )
            }
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SoftPink)
            }
            error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(error!!, color = Muted)
            }
            filtered.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("見つかりませんでした", color = Mist)
            }
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(12.dp, 12.dp, 12.dp, 88.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(filtered, key = { it.id }) { card ->
                        DiscoverCard(
                            card = card,
                            onPreview = { onOpenProfile(card.hrefSlug) },
                            onChat = { onOpenChat(card.hrefSlug) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DiscoverCard(
    card: DiscoverCardDto,
    onPreview: () -> Unit,
    onChat: () -> Unit,
) {
    val base = ApiClient.baseUrl.trimEnd('/')
    val cover = if (card.coverUrl.startsWith("http")) card.coverUrl else base + card.coverUrl

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.72f)
            .clip(RoundedCornerShape(18.dp))
            .clickable(onClick = onPreview),
    ) {
        AsyncImage(
            model = cover,
            contentDescription = card.name,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f)),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(10.dp),
        ) {
            Text(card.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(card.tagline, color = Color.White.copy(alpha = 0.8f), fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    "のぞく",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color.White.copy(alpha = 0.2f))
                        .clickable(onClick = onPreview)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
                Text(
                    "はなす",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(SoftPink)
                        .clickable(onClick = onChat)
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}

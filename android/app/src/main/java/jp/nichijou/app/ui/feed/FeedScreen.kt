package jp.nichijou.app.ui.feed

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import jp.nichijou.app.data.ApiClient
import jp.nichijou.app.data.FeedPostDto
import jp.nichijou.app.ui.theme.CardWhite
import jp.nichijou.app.ui.theme.Cream
import jp.nichijou.app.ui.theme.Gold
import jp.nichijou.app.ui.theme.Ink
import jp.nichijou.app.ui.theme.Mist
import jp.nichijou.app.ui.theme.Muted
import jp.nichijou.app.ui.theme.SoftPink
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    isLoggedIn: Boolean,
    onNeedLogin: () -> Unit,
    onOpenChat: (slug: String, postId: String) -> Unit,
    onOpenProfile: (slug: String) -> Unit,
) {
    var posts by remember { mutableStateOf<List<FeedPostDto>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun reload(fromPull: Boolean = false) {
        scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            try {
                val res = withContext(Dispatchers.IO) { ApiClient.api.feed() }
                posts = res.posts
            } catch (e: Exception) {
                error = e.message ?: "読み込みに失敗しました"
            } finally {
                loading = false
                refreshing = false
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    Column(modifier = Modifier.fillMaxSize().background(Cream)) {
        Text(
            text = "日常",
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            color = Ink,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )

        when {
            loading && posts.isEmpty() -> {
                Box(Modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SoftPink)
                }
            }
            error != null && posts.isEmpty() -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(error!!, color = Muted)
                }
            }
            else -> {
                PullToRefreshBox(
                    isRefreshing = refreshing,
                    onRefresh = { reload(fromPull = true) },
                    modifier = Modifier.fillMaxSize(),
                ) {
                    LazyColumn(
                        contentPadding = PaddingValues(bottom = 88.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(posts, key = { it.id }) { post ->
                            FeedPostCard(
                                post = post,
                                onLike = {
                                    if (!isLoggedIn) {
                                        onNeedLogin()
                                        return@FeedPostCard
                                    }
                                    scope.launch {
                                        try {
                                            val res = withContext(Dispatchers.IO) {
                                                ApiClient.api.toggleLike(post.id)
                                            }
                                            posts = posts.map {
                                                if (it.id == post.id) {
                                                    it.copy(
                                                        likedByMe = res.liked,
                                                        likeCount = res.likeCount,
                                                    )
                                                } else it
                                            }
                                        } catch (_: Exception) {
                                        }
                                    }
                                },
                                onGift = {
                                    if (!isLoggedIn) onNeedLogin()
                                    else onOpenProfile(post.character.slug)
                                },
                                onReply = {
                                    onOpenChat(post.character.slug, post.id)
                                },
                                onOpenProfile = { onOpenProfile(post.character.slug) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FeedPostCard(
    post: FeedPostDto,
    onLike: () -> Unit,
    onGift: () -> Unit,
    onReply: () -> Unit,
    onOpenProfile: () -> Unit,
) {
    val base = ApiClient.baseUrl.trimEnd('/')
    fun abs(url: String?): String? {
        if (url.isNullOrBlank()) return null
        return if (url.startsWith("http")) url else base + url
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(CardWhite)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = abs(post.character.avatarUrl),
                contentDescription = post.character.name,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onOpenProfile),
                contentScale = ContentScale.Crop,
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f).clickable(onClick = onOpenProfile)) {
                Text(post.character.name, fontWeight = FontWeight.Bold, color = Ink, fontSize = 14.sp)
                Text("@${post.character.slug}", color = Mist, fontSize = 11.sp)
            }
            if (post.isAiAssisted) {
                Text("AI", color = SoftPink, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        Text(post.content, color = Ink, fontSize = 14.sp, lineHeight = 20.sp)
        abs(post.imageUrl)?.let { img ->
            Spacer(modifier = Modifier.height(10.dp))
            AsyncImage(
                model = img,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1.2f)
                    .clip(RoundedCornerShape(16.dp)),
                contentScale = ContentScale.Crop,
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onLike) {
                Icon(
                    imageVector = if (post.likedByMe) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = "like",
                    tint = SoftPink,
                )
            }
            Text("${post.likeCount}", color = Muted, fontSize = 12.sp)
            Spacer(modifier = Modifier.width(8.dp))
            Icon(Icons.Filled.ChatBubble, contentDescription = null, tint = Muted, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text("${post.commentCount}", color = Muted, fontSize = 12.sp)
            Spacer(modifier = Modifier.width(12.dp))
            IconButton(onClick = onGift) {
                Icon(Icons.Filled.CardGiftcard, contentDescription = "gift", tint = Gold)
            }
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "返信",
                color = SoftPink,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onReply),
            )
        }
    }
}

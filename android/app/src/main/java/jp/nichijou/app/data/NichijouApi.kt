package jp.nichijou.app.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface NichijouApi {
    @POST("api/mobile/login")
    suspend fun login(@Body body: LoginRequest): Response<LoginResponse>

    @POST("api/mobile/logout")
    suspend fun logout(): Response<Map<String, Boolean>>

    @GET("api/mobile/me")
    suspend fun me(): Response<MeResponse>

    @GET("api/feed")
    suspend fun feed(@Query("tab") tab: String? = null): FeedResponse

    @GET("api/discover")
    suspend fun discover(): DiscoverResponse

    @POST("api/posts/{postId}/likes")
    suspend fun toggleLike(@Path("postId") postId: String): LikeResponse

    @GET("api/posts/{postId}/comments")
    suspend fun comments(@Path("postId") postId: String): CommentsResponse

    @POST("api/posts/{postId}/comments")
    suspend fun postComment(
        @Path("postId") postId: String,
        @Body body: CommentRequest,
    ): Response<Map<String, Any>>

    @POST("api/gifts")
    suspend fun sendGift(@Body body: GiftRequest): Response<GiftResponse>
}

data class LoginRequest(val email: String, val password: String)

data class LoginResponse(val user: UserDto)

data class MeResponse(val user: UserDto?)

data class UserDto(
    val id: String,
    val email: String,
    val name: String?,
    val image: String?,
    val role: String?,
)

data class FeedResponse(
    val posts: List<FeedPostDto>,
    val user: FeedUserDto?,
)

data class FeedUserDto(
    val id: String,
    val name: String?,
    val email: String?,
)

data class FeedPostDto(
    val id: String,
    val content: String,
    val imageUrl: String?,
    val isAiAssisted: Boolean,
    val publishedAt: String,
    val characterId: String,
    val character: CharacterDto,
    val commentCount: Int,
    val likeCount: Int,
    val likedByMe: Boolean,
)

data class CharacterDto(
    val id: String? = null,
    val slug: String,
    val name: String,
    val avatarUrl: String,
    val tagline: String?,
    val tags: String? = null,
)

data class DiscoverResponse(
    val items: List<DiscoverCardDto>,
    val categories: List<IdDto>,
    val genders: List<IdDto>,
)

data class IdDto(val id: String)

data class DiscoverCardDto(
    val id: String,
    val hrefSlug: String,
    val name: String,
    val tagline: String,
    val description: String,
    val coverUrl: String,
    val tags: List<String>,
    val category: String,
    val chats: Int,
    val gender: String,
)

data class LikeResponse(
    val liked: Boolean,
    val likeCount: Int,
)

data class CommentsResponse(
    val comments: List<CommentDto> = emptyList(),
)

data class CommentDto(
    val id: String,
    val content: String,
    val createdAt: String? = null,
)

data class CommentRequest(val content: String)

data class GiftRequest(
    val characterId: String,
    val giftType: String,
)

data class GiftResponse(
    val emoji: String? = null,
    val label: String? = null,
    val error: String? = null,
)

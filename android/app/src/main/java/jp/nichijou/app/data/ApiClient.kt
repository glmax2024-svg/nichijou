package jp.nichijou.app.data

import android.content.Context
import android.webkit.CookieManager
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import jp.nichijou.app.BuildConfig
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * In-memory cookie jar shared with WebView via [syncToWebView].
 */
class SharedCookieJar : CookieJar {
    private val store = ConcurrentHashMap<String, MutableList<Cookie>>()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val host = url.host
        val existing = store.getOrPut(host) { mutableListOf() }
        synchronized(existing) {
            for (cookie in cookies) {
                existing.removeAll { it.name == cookie.name }
                if (cookie.value.isNotEmpty()) {
                    existing.add(cookie)
                }
            }
            syncToWebView(url)
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val host = url.host
        val existing = store[host] ?: return emptyList()
        synchronized(existing) {
            val now = System.currentTimeMillis()
            existing.removeAll { it.persistent && it.expiresAt < now }
            return existing.toList()
        }
    }

    fun clear() {
        store.clear()
        val cm = CookieManager.getInstance()
        cm.removeAllCookies(null)
        cm.flush()
    }

    fun syncToWebView(url: HttpUrl) {
        val cm = CookieManager.getInstance()
        cm.setAcceptCookie(true)
        val cookies = store[url.host] ?: return
        synchronized(cookies) {
            for (cookie in cookies) {
                val cookieStr = "${cookie.name}=${cookie.value}; path=${cookie.path.ifBlank { "/" }}"
                cm.setCookie("${url.scheme}://${url.host}${cookie.path.ifBlank { "/" }}", cookieStr)
            }
        }
        cm.flush()
    }

    fun syncAllToWebView(baseUrl: String) {
        val httpUrl = baseUrl.toHttpUrlOrNull() ?: return
        syncToWebView(httpUrl)
    }
}

object ApiClient {
    lateinit var cookieJar: SharedCookieJar
        private set
    lateinit var api: NichijouApi
        private set
    lateinit var baseUrl: String
        private set

    fun init(@Suppress("UNUSED_PARAMETER") context: Context) {
        baseUrl = BuildConfig.API_BASE_URL.trimEnd('/') + "/"
        cookieJar = SharedCookieJar()

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val okHttp = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()

        val moshi = Moshi.Builder()
            .add(KotlinJsonAdapterFactory())
            .build()

        api = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttp)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(NichijouApi::class.java)
    }
}

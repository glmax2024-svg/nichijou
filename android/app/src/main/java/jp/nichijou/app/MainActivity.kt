package jp.nichijou.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.Box
import jp.nichijou.app.data.ApiClient
import jp.nichijou.app.data.SessionStore
import jp.nichijou.app.ui.login.LoginScreen
import jp.nichijou.app.ui.shell.MainScaffold
import jp.nichijou.app.ui.theme.NichijouTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val sessionStore = SessionStore(this)

        setContent {
            NichijouTheme {
                var showLogin by remember { mutableStateOf(false) }
                var isLoggedIn by remember { mutableStateOf(sessionStore.isLoggedIn) }
                var bootstrapped by remember { mutableStateOf(false) }

                androidx.compose.runtime.LaunchedEffect(Unit) {
                    try {
                        val res = withContext(Dispatchers.IO) { ApiClient.api.me() }
                        if (res.isSuccessful && res.body()?.user != null) {
                            isLoggedIn = true
                            sessionStore.isLoggedIn = true
                            ApiClient.cookieJar.syncAllToWebView(ApiClient.baseUrl)
                        } else {
                            isLoggedIn = false
                            sessionStore.isLoggedIn = false
                        }
                    } catch (_: Exception) {
                        // keep local flag
                    } finally {
                        bootstrapped = true
                    }
                }

                Box(modifier = Modifier.fillMaxSize()) {
                    if (!bootstrapped) {
                        // brief splash — theme bg already set
                    } else if (showLogin) {
                        LoginScreen(
                            onLoggedIn = {
                                isLoggedIn = true
                                sessionStore.isLoggedIn = true
                                showLogin = false
                            },
                            onSkip = {
                                showLogin = false
                            },
                        )
                    } else {
                        MainScaffold(
                            isLoggedIn = isLoggedIn,
                            onNeedLogin = { showLogin = true },
                        )
                    }
                }
            }
        }
    }
}

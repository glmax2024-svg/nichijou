package jp.nichijou.app.ui.shell

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import jp.nichijou.app.ui.discover.DiscoverScreen
import jp.nichijou.app.ui.feed.FeedScreen
import jp.nichijou.app.ui.theme.Mist
import jp.nichijou.app.ui.theme.SoftPink
import jp.nichijou.app.ui.web.AppWebView

enum class MainTab(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    Home("home", "ホーム", Icons.Filled.Home),
    Discover("discover", "発見", Icons.Filled.Explore),
    Messages("messages", "メッセージ", Icons.Filled.Mail),
    Me("me", "マイ", Icons.Filled.Person),
}

@Composable
fun MainScaffold(
    isLoggedIn: Boolean,
    onNeedLogin: () -> Unit,
    openWebPath: String? = null,
    onWebPathConsumed: () -> Unit = {},
) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    // Deep-link from Feed/Discover into a web path overlay route
    androidx.compose.runtime.LaunchedEffect(openWebPath) {
        val path = openWebPath ?: return@LaunchedEffect
        navController.navigate("webview/${android.net.Uri.encode(path)}") {
            launchSingleTop = true
        }
        onWebPathConsumed()
    }

    Scaffold(
        bottomBar = {
            if (currentRoute in MainTab.entries.map { it.route }) {
                NavigationBar(containerColor = androidx.compose.ui.graphics.Color.White) {
                    MainTab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label, fontSize = 10.sp) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = SoftPink,
                                selectedTextColor = SoftPink,
                                unselectedIconColor = Mist,
                                unselectedTextColor = Mist,
                                indicatorColor = SoftPink.copy(alpha = 0.12f),
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = MainTab.Home.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(MainTab.Home.route) {
                FeedScreen(
                    isLoggedIn = isLoggedIn,
                    onNeedLogin = onNeedLogin,
                    onOpenChat = { slug, postId ->
                        navController.navigate(
                            "webview/${android.net.Uri.encode("/app/characters/$slug/chat?post=$postId")}",
                        )
                    },
                    onOpenProfile = { slug ->
                        navController.navigate(
                            "webview/${android.net.Uri.encode("/app/characters/$slug")}",
                        )
                    },
                )
            }
            composable(MainTab.Discover.route) {
                DiscoverScreen(
                    onOpenChat = { slug ->
                        navController.navigate(
                            "webview/${android.net.Uri.encode("/app/characters/$slug/chat")}",
                        )
                    },
                    onOpenProfile = { slug ->
                        navController.navigate(
                            "webview/${android.net.Uri.encode("/app/characters/$slug")}",
                        )
                    },
                )
            }
            composable(MainTab.Messages.route) {
                AppWebView(path = "/app/messages")
            }
            composable(MainTab.Me.route) {
                AppWebView(path = if (isLoggedIn) "/app/me" else "/app/login")
            }
            composable(
                route = "webview/{path}",
                arguments = listOf(navArgument("path") { type = NavType.StringType }),
            ) { entry ->
                val path = android.net.Uri.decode(entry.arguments?.getString("path") ?: "/app")
                AppWebView(path = path)
            }
        }
    }
}

package jp.nichijou.app.ui.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import jp.nichijou.app.data.ApiClient
import jp.nichijou.app.data.LoginRequest
import jp.nichijou.app.ui.theme.Ink
import jp.nichijou.app.ui.theme.Mist
import jp.nichijou.app.ui.theme.PeachBg
import jp.nichijou.app.ui.theme.SoftPink
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LoginScreen(
    onLoggedIn: () -> Unit,
    onSkip: () -> Unit,
) {
    var email by remember { mutableStateOf("fan@demo.jp") }
    var password by remember { mutableStateOf("demo123") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(PeachBg)
            .padding(horizontal = 28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "日常",
            fontSize = 40.sp,
            fontWeight = FontWeight.Black,
            color = Ink,
        )
        Text(
            text = "Nichijou",
            fontSize = 14.sp,
            color = Mist,
        )
        Spacer(Modifier = Modifier.height(32.dp))

        val fieldColors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = SoftPink,
            unfocusedBorderColor = Mist.copy(alpha = 0.4f),
            focusedLabelColor = SoftPink,
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = fieldColors,
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = fieldColors,
        )

        if (error != null) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = error!!, color = SoftPink, fontSize = 13.sp)
        }

        Spacer(modifier = Modifier.height(20.dp))
        Button(
            onClick = {
                loading = true
                error = null
                scope.launch {
                    try {
                        val res = withContext(Dispatchers.IO) {
                            ApiClient.api.login(LoginRequest(email.trim(), password))
                        }
                        if (res.isSuccessful && res.body()?.user != null) {
                            ApiClient.cookieJar.syncAllToWebView(ApiClient.baseUrl)
                            onLoggedIn()
                        } else {
                            error = "ログインに失敗しました"
                        }
                    } catch (e: Exception) {
                        error = e.message ?: "ネットワークエラー"
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Ink),
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.height(22.dp),
                    color = androidx.compose.ui.graphics.Color.White,
                    strokeWidth = 2.dp,
                )
            } else {
                Text("ログイン", fontWeight = FontWeight.Bold)
            }
        }

        TextButton(onClick = onSkip) {
            Text("ゲストとして続ける", color = Mist)
        }
    }
}

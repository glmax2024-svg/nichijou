package jp.nichijou.app.data

import android.content.Context
import androidx.core.content.edit

class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("nichijou_session", Context.MODE_PRIVATE)

    var userJson: String?
        get() = prefs.getString(KEY_USER, null)
        set(value) = prefs.edit { putString(KEY_USER, value) }

    var isLoggedIn: Boolean
        get() = prefs.getBoolean(KEY_LOGGED_IN, false)
        set(value) = prefs.edit { putBoolean(KEY_LOGGED_IN, value) }

    fun clear() {
        prefs.edit { clear() }
    }

    companion object {
        private const val KEY_USER = "user"
        private const val KEY_LOGGED_IN = "logged_in"
    }
}

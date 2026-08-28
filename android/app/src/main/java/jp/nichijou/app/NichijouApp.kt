package jp.nichijou.app

import android.app.Application
import jp.nichijou.app.data.ApiClient

class NichijouApp : Application() {
    override fun onCreate() {
        super.onCreate()
        ApiClient.init(this)
    }
}

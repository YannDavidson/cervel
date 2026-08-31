package ai.cervel.capture

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import org.json.JSONObject

class ShareReceiverActivity: Activity() {
  override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); forward(intent); finish() }
  private fun forward(intent: Intent) {
    if (intent.action != Intent.ACTION_SEND) return
    val payload=JSONObject().put("protocol","cervel-universal-share/v0.1").put("source","android_sharesheet").put("received_at",java.time.Instant.now().toString())
    intent.getStringExtra(Intent.EXTRA_TEXT)?.let { value -> if(value.startsWith("http://")||value.startsWith("https://"))payload.put("url",value) else payload.put("text",value) }
    payload.put("mime_type",intent.type ?: "text/plain")
    getSharedPreferences("cervel_share",MODE_PRIVATE).edit().putString("pending_share",payload.toString()).apply()
    startActivity(Intent(Intent.ACTION_VIEW,android.net.Uri.parse("cervel://share/import")).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
}

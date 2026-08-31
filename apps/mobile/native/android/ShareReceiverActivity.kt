package ai.cervel.capture

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import org.json.JSONObject
import java.io.File

class ShareReceiverActivity: Activity() {
  private val maxBytes=18L*1024L*1024L
  override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); forward(intent); finish() }
  private fun forward(intent: Intent) {
    if (intent.action != Intent.ACTION_SEND) return
    val payload=JSONObject().put("protocol","cervel-universal-share/v0.1").put("source","android_sharesheet").put("received_at",java.time.Instant.now().toString())
    intent.getStringExtra(Intent.EXTRA_TEXT)?.take(2_000_000)?.let { value -> runCatching{Uri.parse(value)}.getOrNull()?.takeIf{it.scheme=="http"||it.scheme=="https"}?.let{payload.put("url",it.toString())}?:payload.put("text",value) }
    val stream=intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM);if(stream!=null&&stream.scheme=="content"){val dir=File(filesDir,"share-staging").apply{mkdirs()};val target=File(dir,java.util.UUID.randomUUID().toString()+".share");contentResolver.openInputStream(stream)?.use{input->target.outputStream().use{out->val buffer=ByteArray(64*1024);var total=0L;while(true){val n=input.read(buffer);if(n<0)break;total+=n;if(total>maxBytes){target.delete();return@use};out.write(buffer,0,n)}}};if(target.exists())payload.put("staged_file",target.name)}
    payload.put("mime_type",intent.type ?: "application/octet-stream")
    if(!payload.has("url")&&!payload.has("text")&&!payload.has("staged_file"))return
    getSharedPreferences("cervel_share",MODE_PRIVATE).edit().putString("pending_share",payload.toString()).apply()
    // Explicit package + fixed route: deep link wakes the app but carries no attacker-controlled payload.
    startActivity(Intent(Intent.ACTION_VIEW,Uri.parse("cervel://share/import")).setPackage(packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }
}

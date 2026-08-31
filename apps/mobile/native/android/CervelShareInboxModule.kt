package ai.cervel.capture
import android.util.Base64
import com.facebook.react.bridge.*
import org.json.JSONObject
import java.io.File
class CervelShareInboxModule(private val context:ReactApplicationContext):ReactContextBaseJavaModule(context){override fun getName()="CervelShareInbox";@ReactMethod fun consume(promise:Promise){try{val prefs=context.getSharedPreferences("cervel_share",0);val raw=prefs.getString("pending_share",null)?:return promise.resolve(null);prefs.edit().remove("pending_share").apply();val payload=JSONObject(raw);payload.optString("staged_file").takeIf{it.isNotBlank()&&!it.contains("/")}?.let{name->val file=File(File(context.filesDir,"share-staging"),name);if(file.exists()&&file.length()<=18L*1024L*1024L){payload.put("content_base64",Base64.encodeToString(file.readBytes(),Base64.NO_WRAP));file.delete()};payload.remove("staged_file")};promise.resolve(payload.toString())}catch(e:Exception){promise.reject("UNIVERSAL_SHARE_INVALID",e)}}}

package ai.cervel.capture
import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
class CervelShareInboxPackage:ReactPackage{override fun createNativeModules(context:ReactApplicationContext)=listOf<NativeModule>(CervelShareInboxModule(context));override fun createViewManagers(context:ReactApplicationContext)=emptyList<ViewManager<*,*>>()}

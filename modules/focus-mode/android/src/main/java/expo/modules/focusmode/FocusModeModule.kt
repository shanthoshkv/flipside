package expo.modules.focusmode

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Do Not Disturb while focusing. Needs the user to grant "Do Not Disturb access" once in system settings.
 * The previous interruption filter is saved to disk so it is restored even if the app was killed mid-session.
 */
class FocusModeModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  private val manager: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private val prefs
    get() = context.getSharedPreferences("flipside_focus_mode", Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("FocusMode")

    Function("isGranted") {
      manager.isNotificationPolicyAccessGranted
    }

    Function("openSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // true = applied, false = not permitted
    Function("setEnabled") { on: Boolean ->
      val nm = manager
      if (!nm.isNotificationPolicyAccessGranted) {
        false
      } else {
        if (on) {
          if (!prefs.contains("previous")) {
            prefs.edit().putInt("previous", nm.currentInterruptionFilter).apply()
          }
          nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS)
        } else if (prefs.contains("previous")) {
          nm.setInterruptionFilter(prefs.getInt("previous", NotificationManager.INTERRUPTION_FILTER_ALL))
          prefs.edit().remove("previous").apply()
        }
        true
      }
    }
  }
}

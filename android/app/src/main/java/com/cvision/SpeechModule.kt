package com.cvision

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var speechRecognizer: SpeechRecognizer? = null
    private var isListening = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val audioManager: AudioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var appInForeground = false
    private var soundsMuted = false

    init {
        // Register for activity lifecycle events using application context
        reactApplicationContext.applicationContext?.let { ctx ->
            if (ctx is android.app.Application) {
                ctx.registerActivityLifecycleCallbacks(object : android.app.Application.ActivityLifecycleCallbacks {
                    override fun onActivityResumed(activity: Activity) {
                        appInForeground = true
                        muteSounds()
                    }
                    override fun onActivityPaused(activity: Activity) {
                        appInForeground = false
                        unmuteSounds()
                    }
                    override fun onActivityCreated(a: Activity, s: Bundle?) {}
                    override fun onActivityStarted(a: Activity) {}
                    override fun onActivityStopped(a: Activity) {}
                    override fun onActivitySaveInstanceState(a: Activity, outState: Bundle) {}
                    override fun onActivityDestroyed(a: Activity) {}
                })
            }
        }
    }

    override fun getName(): String = "SpeechRecognition"

    private fun muteSounds() {
        if (soundsMuted) return
        soundsMuted = true
        // Mute more streams to prevent the "ding" sound
        audioManager.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_MUTE, 0)
        audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_MUTE, 0)
        audioManager.adjustStreamVolume(AudioManager.STREAM_DTMF, AudioManager.ADJUST_MUTE, 0)
        audioManager.adjustStreamVolume(AudioManager.STREAM_RING, AudioManager.ADJUST_MUTE, 0)
    }

    private fun unmuteSounds() {
        if (!soundsMuted) return
        soundsMuted = false
        audioManager.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_UNMUTE, 0)
        audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, 0)
        audioManager.adjustStreamVolume(AudioManager.STREAM_DTMF, AudioManager.ADJUST_UNMUTE, 0)
        audioManager.adjustStreamVolume(AudioManager.STREAM_RING, AudioManager.ADJUST_UNMUTE, 0)
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        val available = SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)
        promise.resolve(available)
    }

    @ReactMethod
    fun startListening() {
        mainHandler.post {
            try {
                if (!SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)) {
                    val params = Arguments.createMap()
                    params.putString("error", "Speech recognition not available on this device")
                    sendEvent("onSpeechError", params)
                    return@post
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactApplicationContext)
                speechRecognizer?.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        val p = Arguments.createMap()
                        p.putString("status", "ready")
                        sendEvent("onSpeechStart", p)
                    }

                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}

                    override fun onError(error: Int) {
                        val errorMsg = when (error) {
                            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                            SpeechRecognizer.ERROR_CLIENT -> "Client side error"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission not granted"
                            SpeechRecognizer.ERROR_NETWORK -> "Network error"
                            SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
                            SpeechRecognizer.ERROR_SERVER -> "Server error"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                            else -> "Error code: $error"
                        }
                        val p = Arguments.createMap()
                        p.putString("error", errorMsg)
                        sendEvent("onSpeechError", p)
                        setIsListening(false)
                    }

                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val p = Arguments.createMap()
                            p.putString("value", matches[0])
                            sendEvent("onSpeechResults", p)
                        }
                        setIsListening(false)
                    }

                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            val p = Arguments.createMap()
                            p.putString("value", matches[0])
                            p.putBoolean("isFinal", false)
                            sendEvent("onSpeechPartialResults", p)
                        }
                    }

                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                    putExtra(RecognizerIntent.EXTRA_PROMPT, "")
                    // Use voice input source with echo cancellation
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 5000L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 3000L)
                }

                // Mute sounds before starting to prevent the "ding"
                muteSounds()
                speechRecognizer?.startListening(intent)
                isListening = true
                setIsListening(true)

            } catch (e: Exception) {
                val p = Arguments.createMap()
                p.putString("error", "Failed to start: ${e.message}")
                sendEvent("onSpeechError", p)
            }
        }
    }

    @ReactMethod
    fun stopListening() {
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
            } catch (e: Exception) {}
            setIsListening(false)
        }
    }

    private fun setIsListening(listening: Boolean) {
        isListening = listening
        val params = Arguments.createMap()
        params.putBoolean("listening", listening)
        sendEvent("onSpeechStateChange", params)
        // Sounds are restored by activity lifecycle, not here
    }

    override fun onCatalystInstanceDestroy() {
        mainHandler.post {
            try {
                speechRecognizer?.destroy()
            } catch (e: Exception) {}
            speechRecognizer = null
        }
        unmuteSounds()
        super.onCatalystInstanceDestroy()
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter compatibility
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter compatibility
    }
}

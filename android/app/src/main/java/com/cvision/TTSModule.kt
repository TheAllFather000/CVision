package com.cvision

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Locale

class TTSModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private var speechRate = 0.85f
    private var pitch = 1.0f
    private var pendingUtteranceId = 0

    override fun getName(): String = "TTS"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    init {
        tts = TextToSpeech(reactApplicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.US

                // Select the best available voice
                val availableVoices = tts?.voices
                if (availableVoices != null) {
                    val englishVoices = availableVoices.filter {
                        it.locale.language == "en" && !it.isNetworkConnectionRequired
                    }

                    // Score voices: prefer high quality, local, enhanced
                    val bestVoice = englishVoices.maxByOrNull { voice ->
                        var score = 0
                        if (voice.locale == Locale.US) score += 100
                        else if (voice.locale == Locale.UK) score += 50
                        if (voice.quality >= 400) score += 200
                        else if (voice.quality >= 300) score += 100
                        if (voice.features.contains("highQuality")) score += 150
                        if (voice.features.contains("notInstalled")) score -= 200
                        if (voice.name.contains("google", ignoreCase = true)) score += 50
                        if (voice.name.contains("enhanced", ignoreCase = true)) score += 30
                        if (voice.name.contains("premium", ignoreCase = true)) score += 30
                        score
                    }

                    if (bestVoice != null) {
                        tts?.voice = bestVoice
                        android.util.Log.d("TTS", "Selected voice: ${bestVoice.name} (quality=${bestVoice.quality})")
                    }
                }

                tts?.setSpeechRate(0.85f)
                tts?.setPitch(1.0f)
                isInitialized = true

                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        android.util.Log.d("TTS", "onStart: $utteranceId")
                        val params = Arguments.createMap()
                        params.putString("utteranceId", utteranceId)
                        sendEvent("tts-start", params)
                    }

                    override fun onDone(utteranceId: String?) {
                        android.util.Log.d("TTS", "onDone: $utteranceId")
                        val params = Arguments.createMap()
                        params.putString("utteranceId", utteranceId)
                        sendEvent("tts-finish", params)
                    }

                    override fun onError(utteranceId: String?) {
                        android.util.Log.e("TTS", "onError: $utteranceId")
                        val params = Arguments.createMap()
                        params.putString("utteranceId", utteranceId)
                        sendEvent("tts-error", params)
                    }
                })
            }
        }
    }

    @ReactMethod
    fun speak(text: String, priority: String = "normal", promise: Promise) {
        android.util.Log.d("TTS", "speak called: $text, priority: $priority")
        try {
            if (!isInitialized) {
                android.util.Log.e("TTS", "not initialized!")
                promise.reject("TTS_NOT_READY", "TTS not initialized yet")
                return
            }

            if (priority == "urgent") {
                tts?.stop()
            }

            val utteranceId = "utt_${pendingUtteranceId++}"
            val result = tts?.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId)
            android.util.Log.d("TTS", "speak result: $result")
            promise.resolve(utteranceId)
        } catch (e: Exception) {
            android.util.Log.e("TTS", "speak exception: ${e.message}")
            promise.reject("TTS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            tts?.stop()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TTS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setSpeechRate(rate: Double, promise: Promise) {
        try {
            speechRate = rate.toFloat()
            tts?.setSpeechRate(speechRate)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TTS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setPitch(newPitch: Double, promise: Promise) {
        try {
            pitch = newPitch.toFloat()
            tts?.setPitch(pitch)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TTS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(isInitialized)
    }

    override fun onCatalystInstanceDestroy() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        isInitialized = false
        super.onCatalystInstanceDestroy()
    }

    @ReactMethod
    fun getVoices(promise: Promise) {
        try {
            val voices = tts?.voices ?: emptySet()
            val result = com.facebook.react.bridge.Arguments.createArray()
            for (voice in voices) {
                if (voice.locale.language == "en") {
                    val map = com.facebook.react.bridge.Arguments.createMap()
                    map.putString("name", voice.name)
                    map.putString("locale", voice.locale.toLanguageTag())
                    map.putInt("quality", voice.quality)
                    map.putBoolean("isNetwork", voice.isNetworkConnectionRequired)
                    val features = com.facebook.react.bridge.Arguments.createArray()
                    for (f in voice.features) features.pushString(f)
                    map.putArray("features", features)
                    result.pushMap(map)
                }
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("TTS_ERROR", e.message)
        }
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

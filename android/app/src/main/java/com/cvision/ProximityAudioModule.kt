package com.cvision

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import kotlin.math.sin

class ProximityAudioModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var audioTrack: AudioTrack? = null
    private var isPlaying = false
    private var currentFrequency = 0.0
    private var currentVolume = 0.0
    private var phase = 0.0

    override fun getName(): String = "ProximityAudio"

    @ReactMethod
    fun start() {
        if (isPlaying) return

        val sampleRate = 44100
        val bufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setSampleRate(sampleRate)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(bufferSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        audioTrack?.play()
        isPlaying = true

        // Audio generation thread
        Thread {
            val buffer = ShortArray(bufferSize / 2)
            while (isPlaying) {
                if (currentFrequency > 0 && currentVolume > 0) {
                    val samplesPerCycle = (sampleRate / currentFrequency).toInt()
                    for (i in buffer.indices) {
                        buffer[i] = (sin(2.0 * Math.PI * phase / samplesPerCycle) *
                                currentVolume * Short.MAX_VALUE).toInt().toShort()
                        phase += 1
                        if (phase >= samplesPerCycle) phase = 0.0
                    }
                } else {
                    buffer.fill(0)
                }
                audioTrack?.write(buffer, 0, buffer.size)
                Thread.sleep(10) // Small delay to prevent CPU hogging
            }
        }.start()
    }

    @ReactMethod
    fun stop() {
        isPlaying = false
        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null
        currentFrequency = 0.0
        currentVolume = 0.0
    }

    @ReactMethod
    fun update(frequency: Double, volume: Double) {
        currentFrequency = frequency
        currentVolume = volume.coerceIn(0.0, 1.0)
    }

    override fun onCatalystInstanceDestroy() {
        stop()
        super.onCatalystInstanceDestroy()
    }
}

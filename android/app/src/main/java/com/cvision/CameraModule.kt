package com.cvision

import android.app.Activity
import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class CameraModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var capturePromise: Promise? = null
    private var photoPath: String? = null
    private var resumeListener: LifecycleEventListener? = null
    private var resumeRetryCount = 0
    private var sawPauseDuringCapture = false

    private val mainHandler = Handler(Looper.getMainLooper())

    private fun prefs() =
        reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun clearCapturePrefs() {
        prefs().edit().clear().apply()
    }

    private fun removeResumeListener() {
        resumeListener?.let {
            reactApplicationContext.removeLifecycleEventListener(it)
            resumeListener = null
        }
        resumeRetryCount = 0
        sawPauseDuringCapture = false
    }

    private fun tryDeliverOnResume() {
        synchronized(CAPTURE_LOCK) {
            if (!sawPauseDuringCapture) return
            val promise = capturePromise ?: return
            val path = photoPath ?: prefs().getString(KEY_PATH, null)
            if (path.isNullOrBlank()) return

            if (File(path).exists()) {
                deliverSuccessLocked(path, promise)
                removeResumeListener()
                return
            }

            if (resumeRetryCount >= RESUME_MAX_RETRIES) {
                clearCapturePrefs()
                capturePromise = null
                runOnUi { promise.reject("CAMERA_NO_FILE", "Photo file was not written") }
                removeResumeListener()
                return
            }
            resumeRetryCount++
            mainHandler.postDelayed({ tryDeliverOnResume() }, RESUME_RETRY_MS)
        }
    }

    private fun registerResumeFallback() {
        removeResumeListener()
        sawPauseDuringCapture = false
        resumeListener = object : LifecycleEventListener {
            override fun onHostResume() {
                tryDeliverOnResume()
            }

            override fun onHostPause() {
                sawPauseDuringCapture = true
            }

            override fun onHostDestroy() {}
        }
        reactApplicationContext.addLifecycleEventListener(resumeListener!!)
    }

    private fun runOnUi(block: () -> Unit) {
        reactApplicationContext.runOnUiQueueThread(block)
    }

    private fun deliverSuccessLocked(resolvedPath: String, promise: Promise) {
        capturePromise = null
        prefs().edit()
            .putString(KEY_PATH, resolvedPath)
            .putLong(KEY_COMPLETED_AT, System.currentTimeMillis())
            .apply()
        runOnUi { promise.resolve(resolvedPath) }
    }

    private fun deliverOrphanLocked(resolvedPath: String) {
        prefs().edit()
            .putString(KEY_PATH, resolvedPath)
            .putLong(KEY_COMPLETED_AT, System.currentTimeMillis())
            .putBoolean(KEY_ORPHAN, true)
            .apply()
    }

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != REQUEST_CODE_PHOTO) return

            val resolvedPath = photoPath ?: prefs().getString(KEY_PATH, null)

            if (resultCode == Activity.RESULT_OK && resolvedPath != null) {
                if (File(resolvedPath).exists()) {
                    synchronized(CAPTURE_LOCK) {
                        val promise = capturePromise
                        capturePromise = null
                        removeResumeListener()
                        if (promise != null) {
                            deliverSuccessLocked(resolvedPath, promise)
                        } else {
                            deliverOrphanLocked(resolvedPath)
                        }
                    }
                } else {
                    mainHandler.postDelayed({
                        synchronized(CAPTURE_LOCK) {
                            if (resolvedPath != null && File(resolvedPath).exists()) {
                                val promise = capturePromise
                                capturePromise = null
                                removeResumeListener()
                                if (promise != null) {
                                    deliverSuccessLocked(resolvedPath, promise)
                                } else {
                                    deliverOrphanLocked(resolvedPath)
                                }
                            }
                        }
                    }, FILE_RETRY_MS)
                }
            } else {
                synchronized(CAPTURE_LOCK) {
                    clearCapturePrefs()
                    val promise = capturePromise
                    capturePromise = null
                    removeResumeListener()
                    if (promise != null) {
                        runOnUi { promise.reject("CAMERA_CANCELLED", "Photo capture cancelled") }
                    }
                }
            }
        }
    }

    init {
        reactApplicationContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "CameraModule"

    @ReactMethod
    fun capturePhoto(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        capturePromise = promise

        try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val storageDir = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
            val photoFile = File.createTempFile("CVISION_${timeStamp}_", ".jpg", storageDir)
            photoPath = photoFile.absolutePath

            prefs().edit()
                .clear()
                .putString(KEY_PATH, photoPath)
                .apply()

            val photoUri = FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                photoFile
            )

            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
            takePictureIntent.clipData = ClipData.newUri(
                reactApplicationContext.contentResolver,
                "CVision capture",
                photoUri
            )
            takePictureIntent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )

            val cam = takePictureIntent.resolveActivity(reactApplicationContext.packageManager)
            if (cam != null) {
                try {
                    reactApplicationContext.grantUriPermission(
                        cam.packageName,
                        photoUri,
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                } catch (_: Exception) {
                }
            }

            if (takePictureIntent.resolveActivity(reactApplicationContext.packageManager) != null) {
                registerResumeFallback()
                activity.startActivityForResult(takePictureIntent, REQUEST_CODE_PHOTO, null)
            } else {
                promise.reject("NO_CAMERA", "No camera app available")
                capturePromise = null
                clearCapturePrefs()
                removeResumeListener()
            }
        } catch (e: Exception) {
            promise.reject("CAMERA_ERROR", e.message)
            capturePromise = null
            clearCapturePrefs()
            removeResumeListener()
        }
    }

    @ReactMethod
    fun finalizeCaptureFlow(promise: Promise) {
        clearCapturePrefs()
        promise.resolve(true)
    }

    @ReactMethod
    fun getOrphanCapturePath(promise: Promise) {
        synchronized(CAPTURE_LOCK) {
            val p = prefs()
            if (!p.getBoolean(KEY_ORPHAN, false)) {
                promise.resolve(null)
                return
            }
            val age = System.currentTimeMillis() - p.getLong(KEY_COMPLETED_AT, 0L)
            if (age > ORPHAN_MAX_AGE_MS) {
                clearCapturePrefs()
                promise.resolve(null)
                return
            }
            val path = p.getString(KEY_PATH, null)
            if (path.isNullOrBlank() || !File(path).exists()) {
                clearCapturePrefs()
                promise.resolve(null)
                return
            }
            p.edit().putBoolean(KEY_ORPHAN, false).apply()
            promise.resolve(path)
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        val available = intent.resolveActivity(reactApplicationContext.packageManager) != null
        promise.resolve(available)
    }

    @ReactMethod
    fun analyzeObjects(path: String, promise: Promise) {
        if (path.isBlank()) {
            promise.reject("BAD_PATH", "Empty image path")
            return
        }
        try {
            val uri = when {
                path.startsWith("file:") || path.startsWith("content:") -> Uri.parse(path)
                else -> Uri.fromFile(File(path))
            }
            val image = InputImage.fromFilePath(reactApplicationContext, uri)
            val w = image.width.toFloat().coerceAtLeast(1f)
            val h = image.height.toFloat().coerceAtLeast(1f)

            val options = ObjectDetectorOptions.Builder()
                .setDetectorMode(ObjectDetectorOptions.SINGLE_IMAGE_MODE)
                .enableMultipleObjects()
                .enableClassification()
                .build()

            val detector = ObjectDetection.getClient(options)
            detector.process(image)
                .addOnSuccessListener { detectedObjects ->
                    val results = Arguments.createArray()
                    for (obj in detectedObjects) {
                        val map = Arguments.createMap()
                        val labelsArr = Arguments.createArray()
                        for (lbl in obj.labels) {
                            val lm = Arguments.createMap()
                            lm.putString("text", lbl.text)
                            lm.putDouble("confidence", lbl.confidence.toDouble())
                            labelsArr.pushMap(lm)
                        }
                        map.putArray("labels", labelsArr)
                        val b = obj.boundingBox
                        val box = Arguments.createMap()
                        box.putDouble("left", (b.left / w).toDouble())
                        box.putDouble("top", (b.top / h).toDouble())
                        box.putDouble("width", (b.width() / w).toDouble())
                        box.putDouble("height", (b.height() / h).toDouble())
                        map.putMap("box", box)
                        results.pushMap(map)
                    }
                    runOnUi { promise.resolve(results) }
                }
                .addOnFailureListener { e ->
                    runOnUi { promise.reject("ML_ANALYZE", e.message, e) }
                }
        } catch (e: Exception) {
            promise.reject("ML_ANALYZE", e.message)
        }
    }

    @ReactMethod
    fun analyzeImageLabels(path: String, promise: Promise) {
        if (path.isBlank()) {
            promise.reject("BAD_PATH", "Empty image path")
            return
        }
        try {
            val uri = when {
                path.startsWith("file:") || path.startsWith("content:") -> Uri.parse(path)
                else -> Uri.fromFile(File(path))
            }
            val image = InputImage.fromFilePath(reactApplicationContext, uri)

            // Use lower threshold to catch more objects
            val options = ImageLabelerOptions.Builder()
                .setConfidenceThreshold(0.3f)
                .build()

            val labeler = ImageLabeling.getClient(options)
            labeler.process(image)
                .addOnSuccessListener { labels ->
                    val results = Arguments.createArray()
                    for (label in labels) {
                        val map = Arguments.createMap()
                        map.putString("text", label.text)
                        map.putDouble("confidence", label.confidence.toDouble())
                        results.pushMap(map)
                    }
                    runOnUi { promise.resolve(results) }
                }
                .addOnFailureListener { e ->
                    runOnUi { promise.reject("ML_LABEL", e.message, e) }
                }
        } catch (e: Exception) {
            promise.reject("ML_LABEL", e.message)
        }
    }

    @ReactMethod
    fun capturePhotoAuto(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        capturePromise = promise
        val mainExecutor = androidx.core.content.ContextCompat.getMainExecutor(reactApplicationContext)

        try {
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val storageDir = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
            val photoFile = File.createTempFile("CVISION_${timeStamp}_", ".jpg", storageDir)
            photoPath = photoFile.absolutePath

            prefs().edit()
                .clear()
                .putString(KEY_PATH, photoPath)
                .apply()

            val cameraProviderFuture = androidx.camera.lifecycle.ProcessCameraProvider.getInstance(reactApplicationContext)
            cameraProviderFuture.addListener({
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    
                    val imageCapture = androidx.camera.core.ImageCapture.Builder()
                        .setCaptureMode(androidx.camera.core.ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()

                    val cameraSelector = androidx.camera.core.CameraSelector.DEFAULT_BACK_CAMERA

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        activity as androidx.lifecycle.LifecycleOwner,
                        cameraSelector,
                        imageCapture
                    )

                    // Countdown: 5 seconds then capture
                    var countdown = 5
                    val vibrator = reactApplicationContext.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
                    val countdownRunnable = object : Runnable {
                        override fun run() {
                            if (countdown > 0) {
                                vibrator.vibrate(50)
                                countdown--
                                mainHandler.postDelayed(this, 1000)
                            } else {
                                val outputOptions = androidx.camera.core.ImageCapture.OutputFileOptions.Builder(photoFile).build()
                                
                                imageCapture.takePicture(
                                    outputOptions,
                                    mainExecutor,
                                    object : androidx.camera.core.ImageCapture.OnImageSavedCallback {
                                        override fun onImageSaved(output: androidx.camera.core.ImageCapture.OutputFileResults) {
                                            cameraProvider.unbindAll()
                                            synchronized(CAPTURE_LOCK) {
                                                val p = capturePromise
                                                if (p != null) {
                                                    deliverSuccessLocked(photoPath!!, p)
                                                } else {
                                                    deliverOrphanLocked(photoPath!!)
                                                }
                                            }
                                        }

                                        override fun onError(exception: androidx.camera.core.ImageCaptureException) {
                                            cameraProvider.unbindAll()
                                            synchronized(CAPTURE_LOCK) {
                                                capturePromise?.reject("CAPTURE_ERROR", exception.message)
                                                capturePromise = null
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    }
                    mainHandler.post(countdownRunnable)

                } catch (e: Exception) {
                    promise.reject("CAMERA_ERROR", e.message)
                    capturePromise = null
                }
            }, mainExecutor)
        } catch (e: Exception) {
            promise.reject("CAMERA_ERROR", e.message)
            capturePromise = null
        }
    }

    companion object {
        private const val REQUEST_CODE_PHOTO = 9001
        private const val PREFS_NAME = "CVisionCameraCapture"
        private const val KEY_PATH = "capture_path"
        private const val KEY_ORPHAN = "orphan_pending_js"
        private const val KEY_COMPLETED_AT = "completed_at"
        private const val ORPHAN_MAX_AGE_MS = 120_000L
        private const val FILE_RETRY_MS = 200L
        private const val RESUME_RETRY_MS = 120L
        private const val RESUME_MAX_RETRIES = 250
        private val CAPTURE_LOCK = Any()
    }
}

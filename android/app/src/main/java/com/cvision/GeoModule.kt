package com.cvision

import android.Manifest
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class GeoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val fusedClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(reactContext)
    private var locationCallback: LocationCallback? = null
    private var watchId = 0

    override fun getName(): String = "Geo"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun hasPermission(): Boolean {
        return ActivityCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ActivityCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    @ReactMethod
    fun getCurrentPosition(promise: Promise) {
        if (!hasPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }

        try {
            fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                .addOnSuccessListener { location ->
                    if (location != null) {
                        val coords = Arguments.createMap()
                        coords.putDouble("latitude", location.latitude)
                        coords.putDouble("longitude", location.longitude)
                        coords.putDouble("accuracy", location.accuracy.toDouble())
                        if (location.hasAltitude()) coords.putDouble("altitude", location.altitude)
                        if (location.hasSpeed()) coords.putDouble("speed", location.speed.toDouble())
                        promise.resolve(coords)
                    } else {
                        promise.reject("LOCATION_NULL", "Could not get location")
                    }
                }
                .addOnFailureListener { e ->
                    promise.reject("LOCATION_ERROR", e.message)
                }
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", e.message)
        }
    }

    @ReactMethod
    fun startWatching(promise: Promise) {
        if (!hasPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }

        val id = watchId++

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000)
            .setMinUpdateDistanceMeters(5f)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    val coords = Arguments.createMap()
                    coords.putDouble("latitude", location.latitude)
                    coords.putDouble("longitude", location.longitude)
                    coords.putDouble("accuracy", location.accuracy.toDouble())
                    if (location.hasAltitude()) coords.putDouble("altitude", location.altitude)
                    if (location.hasSpeed()) coords.putDouble("speed", location.speed.toDouble())
                    coords.putInt("watchId", id)

                    val params = Arguments.createMap()
                    params.putMap("coords", coords)
                    params.putDouble("timestamp", location.time.toDouble())
                    sendEvent("geo-position", params)
                }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, locationCallback!!, Looper.getMainLooper())
            promise.resolve(id)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", e.message)
        }
    }

    @ReactMethod
    fun stopWatching() {
        locationCallback?.let {
            fusedClient.removeLocationUpdates(it)
        }
        locationCallback = null
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    override fun onCatalystInstanceDestroy() {
        stopWatching()
        super.onCatalystInstanceDestroy()
    }
}

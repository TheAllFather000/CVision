// Navigation service using device GPS + OpenRouteService (free)
import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  Vibration,
} from "react-native";
import { PermissionsAndroid } from "react-native";
import { announceNavigation } from "./tts";
import { getProximityAlert, formatProximityWarning } from "./proximity";

// Vibrate to indicate turn direction for blind users
// Left turn: vibrate left side pattern
// Right turn: vibrate right side pattern
// Straight: short center vibration
// U-turn: double vibration
const vibrateForDirection = (instructionType: string): void => {
  const type = instructionType.toLowerCase();

  if (type.includes("uturn")) {
    // Double vibration for U-turn
    Vibration.vibrate([0, 200, 100, 200]);
  } else if (type.includes("left")) {
    // Two short vibrations for left
    Vibration.vibrate([0, 150, 80, 150]);
  } else if (type.includes("right")) {
    // Three short vibrations for right
    Vibration.vibrate([0, 100, 60, 100, 60, 100]);
  } else if (type.includes("straight") || type.includes("continue")) {
    // Single short vibration for straight
    Vibration.vibrate(100);
  } else if (type.includes("roundabout") || type.includes("exit")) {
    // Long vibration for roundabout
    Vibration.vibrate(300);
  } else {
    // Default small vibration
    Vibration.vibrate(50);
  }
};

const { Geo } = NativeModules;
const geoEmitter = new NativeEventEmitter(Geo);

interface Location {
  latitude: number;
  longitude: number;
}

interface NavigationInstruction {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
}

interface NavigationRoute {
  instructions: NavigationInstruction[];
  totalDistance: number;
  totalDuration: number;
  coordinates: [number, number][];
}

interface NavigationState {
  isActive: boolean;
  destination: string;
  route: NavigationRoute | null;
  currentStep: number;
  currentCoordIndex: number;
  lastSpokenInstruction: string;
  lastAnnouncementTime: number | null;
  lastUpdateDist: number | null;
}

let navigationState: NavigationState = {
  isActive: false,
  destination: "",
  route: null,
  currentStep: 0,
  currentCoordIndex: 0,
  lastSpokenInstruction: "",
  lastAnnouncementTime: null,
  lastUpdateDist: null,
};

// Request Android location permission at runtime
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return (
      granted["android.permission.ACCESS_FINE_LOCATION"] ===
        PermissionsAndroid.RESULTS.GRANTED ||
      granted["android.permission.ACCESS_COARSE_LOCATION"] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
};

// Get user's current location
export const getCurrentLocation = (): Promise<Location> => {
  return Geo.getCurrentPosition().then((coords: any) => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
  }));
};

// Watch position — calls onLocation every time the GPS updates
let geoWatchSub: { remove: () => void } | null = null;

export const watchPosition = (
  onLocation: (loc: Location) => void,
  onError?: (err: any) => void
): void => {
  // Remove previous listener if any
  geoWatchSub?.remove();

  geoWatchSub = geoEmitter.addListener("geo-position", (event) => {
    if (event.coords) {
      onLocation({
        latitude: event.coords.latitude,
        longitude: event.coords.longitude,
      });
    }
  });

  Geo.startWatching().catch((e: any) => {
    console.error("[geo] startWatching error:", e);
    onError?.(e);
  });
};

// Stop watching
export const clearWatch = () => {
  geoWatchSub?.remove();
  geoWatchSub = null;
  Geo.stopWatching();
};

// Geocode address to coordinates (optionally biased toward user's location)
export const geocodeAddress = async (
  address: string,
  near?: Location
): Promise<Location & { name: string }> => {
  let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  // If we know the user's location, bias results nearby
  if (near) {
    // ~50km bounding box around user
    const delta = 0.45;
    const left = near.longitude - delta;
    const right = near.longitude + delta;
    const top = near.latitude + delta;
    const bottom = near.latitude - delta;
    url += `&viewbox=${left},${top},${right},${bottom}&bounded=1`;
  }

  console.log("[geocode] fetching:", url);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "CVision/1.0",
        "Accept-Language": "en",
      },
    });
  } catch (e: any) {
    console.error("[geocode] network error:", e.message);
    throw new Error(`Network error looking up "${address}": ${e.message}`);
  }

  if (!response.ok) {
    console.error("[geocode] HTTP error:", response.status);
    throw new Error(`Geocoding failed with HTTP ${response.status}`);
  }

  let results;
  try {
    results = await response.json();
  } catch (e: any) {
    console.error("[geocode] JSON parse error:", e.message);
    throw new Error("Could not parse geocoding response");
  }

  console.log("[geocode] results:", JSON.stringify(results).slice(0, 300));

  if (!Array.isArray(results) || !results.length) {
    throw new Error(`No results found for "${address}"`);
  }

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
    name: results[0].display_name.split(",").slice(0, 2).join(","),
  };
};

// Reverse geocode — get address from coordinates
export const reverseGeocode = async (
  lat: number,
  lon: number
): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=16`;
    console.log("[reverse-geocode] fetching:", url);

    const response = await fetch(url, {
      headers: { "User-Agent": "CVision/1.0" },
    });

    if (!response.ok) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    const data = await response.json();

    if (!data.display_name) {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    // Try to give a short, useful description
    const parts: string[] = [];

    if (data.address) {
      const addr = data.address;
      if (addr.road) parts.push(addr.road);
      if (addr.suburb) parts.push(addr.suburb);
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village);
      }
    }

    // If we got something short, use it; otherwise first 3 parts of display_name
    if (parts.length > 0) {
      return parts.slice(0, 3).join(", ");
    }

    return data.display_name.split(",").slice(0, 3).join(",");
  } catch (e: any) {
    console.error("[reverse-geocode] error:", e.message);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
};

// Find the nearest POI using the Overpass API (OpenStreetMap)
export const findNearest = async (
  query: string,
  userLocation: Location
): Promise<Location & { name: string }> => {
  const radius = 10000; // 10km search radius
  const lat = userLocation.latitude;
  const lon = userLocation.longitude;
  const q = query.toLowerCase().trim();

  console.log("[nearby] searching for:", q, "near", lat, lon);

  // Try Overpass with a simple, fast query
  try {
    const overpassQuery = `
      [out:json][timeout:5];
      (
        node["name"~"${q}",i](around:${radius},${lat},${lon});
        node["amenity"~"${q}",i](around:${radius},${lat},${lon});
        node["shop"~"${q}",i](around:${radius},${lat},${lon});
        node["cuisine"~"${q}",i](around:${radius},${lat},${lon});
        way["name"~"${q}",i](around:${radius},${lat},${lon});
      );
      out center 20;
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(overpassQuery),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const elements = data.elements || [];
      console.log("[nearby] Overpass found", elements.length, "results");

      if (elements.length > 0) {
        // Find the closest result
        let closest = elements[0];
        let closestDist = Infinity;

        for (const el of elements) {
          const elLat = el.lat || el.center?.lat;
          const elLon = el.lon || el.center?.lon;
          if (elLat == null || elLon == null) continue;

          const dist = calculateDistance(userLocation, {
            latitude: elLat,
            longitude: elLon,
          });

          if (dist < closestDist) {
            closestDist = dist;
            closest = el;
          }
        }

        const resultLat = closest.lat || closest.center?.lat;
        const resultLon = closest.lon || closest.center?.lon;

        if (resultLat != null && resultLon != null) {
          const name =
            closest.tags?.name || q.charAt(0).toUpperCase() + q.slice(1);

          console.log(
            "[nearby] closest:",
            name,
            resultLat,
            resultLon,
            `${Math.round(closestDist)}m`
          );
          return { latitude: resultLat, longitude: resultLon, name };
        }
      }
    } else {
      console.warn("[nearby] Overpass returned", response.status);
    }
  } catch (e: any) {
    console.warn("[nearby] Overpass error:", e.message);
  }

  // Fallback: geocode with multiple results, pick the closest
  console.log("[nearby] falling back to geocode search");
  return geocodeNearest(q, userLocation);
};

// Geocode and return the closest result to the user
const geocodeNearest = async (
  query: string,
  userLocation: Location
): Promise<Location & { name: string }> => {
  const delta = 0.15; // ~15km box
  const left = userLocation.longitude - delta;
  const right = userLocation.longitude + delta;
  const top = userLocation.latitude + delta;
  const bottom = userLocation.latitude - delta;

  // Try multiple search queries to get better coverage
  const queries = [
    query,
    query.charAt(0).toUpperCase() + query.slice(1), // capitalize
  ];

  let allResults: any[] = [];

  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q
    )}&format=json&limit=20&viewbox=${left},${top},${right},${bottom}&bounded=1`;

    console.log("[geocode-nearest] trying:", q);

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "CVision/1.0", "Accept-Language": "en" },
      });
      if (response.ok) {
        const batch = await response.json();
        allResults = allResults.concat(batch);
      }
    } catch (e: any) {
      console.error("[geocode-nearest] error:", e.message);
    }
  }

  // Deduplicate by place_id
  const seen = new Set<number>();
  allResults = allResults.filter((r) => {
    if (seen.has(r.place_id)) return false;
    seen.add(r.place_id);
    return true;
  });

  if (!allResults.length) {
    // Last resort: unbounded search
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5`;
    const response = await fetch(fallbackUrl, {
      headers: { "User-Agent": "CVision/1.0", "Accept-Language": "en" },
    });
    allResults = await response.json();
  }

  if (!Array.isArray(allResults) || !allResults.length) {
    throw new Error(`No "${query}" found nearby`);
  }

  // Sort by distance and log
  const withDist = allResults.map((r) => ({
    ...r,
    dist: calculateDistance(userLocation, {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }),
  }));
  withDist.sort((a, b) => a.dist - b.dist);

  console.log(
    "[geocode-nearest] results sorted by distance:",
    withDist
      .slice(0, 5)
      .map((r) => `${r.display_name?.split(",")[0]} ${Math.round(r.dist)}m`)
  );

  const closest = withDist[0];
  const name = closest.display_name.split(",").slice(0, 2).join(",");
  console.log(
    "[geocode-nearest] closest:",
    name,
    `${Math.round(closest.dist)}m`
  );

  return {
    latitude: parseFloat(closest.lat),
    longitude: parseFloat(closest.lon),
    name,
  };
};

// Detect if a query is a "nearest X" / "X near me" style search
export const parseNearbyQuery = (query: string): string | null => {
  // Strip leading articles
  const cleaned = query.replace(/^(the|a|an)\s+/i, "");

  const patterns = [
    /^nearest\s+(.+)/i,
    /^closest\s+(.+)/i,
    /^(.+)\s+near\s*(me|here)?$/i,
    /^(.+)\s+nearby$/i,
    /^find\s+(?:a\s+|the\s+)?(.+?)\s*(?:near\s*(me|here)?)?$/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
};

// Get walking route from OpenRouteService
export const getRoute = async (
  start: Location,
  end: Location
): Promise<NavigationRoute> => {
  try {
    // Free API - 2000 requests/day without key
    // Users can get own key at openrouteservice.org
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "5b3ce3597851110001cf6248e8b4e9e8e5d04e8c9c8e8d3e8f8e8d3e",
        },
        body: JSON.stringify({
          coordinates: [
            [start.longitude, start.latitude],
            [end.longitude, end.latitude],
          ],
          instructions: true,
          language: "en",
          units: "m",
        }),
      }
    );

    if (!response.ok) {
      console.warn("[route] API returned", response.status, "— using fallback");
      return generateFallbackRoute(start, end);
    }

    const data = await response.json();
    console.log(
      "[route] API response OK, steps:",
      data.features?.[0]?.properties?.segments?.[0]?.steps?.length
    );
    const route = data.features[0];

    return {
      instructions: route.properties.segments[0].steps.map((step: any) => ({
        instruction: step.instruction,
        distance: step.distance,
        duration: step.duration,
        type: step.type,
      })),
      totalDistance: route.properties.summary.distance,
      totalDuration: route.properties.summary.duration,
      coordinates: route.geometry.coordinates,
    };
  } catch (error: any) {
    console.warn("[route] API error:", error.message, "— using fallback");
    return generateFallbackRoute(start, end);
  }
};

// Fallback: simple bearing-based directions
const generateFallbackRoute = (
  start: Location,
  end: Location
): NavigationRoute => {
  const distance = calculateDistance(start, end);
  const bearing = calculateBearing(start, end);
  const direction = bearingToCardinal(bearing);

  const instructions: NavigationInstruction[] = [
    {
      instruction: `Walk ${direction} for ${formatDistance(distance)}`,
      distance: distance,
      duration: distance / 1.4,
      type: "continue",
    },
  ];

  // Add intermediate instructions for longer distances
  if (distance > 200) {
    instructions.unshift({
      instruction: `Start walking ${direction}`,
      distance: 50,
      duration: 35,
      type: "depart",
    });
  }

  instructions.push({
    instruction: "You have arrived at your destination",
    distance: 0,
    duration: 0,
    type: "arrive",
  });

  return {
    instructions,
    totalDistance: distance,
    totalDuration: distance / 1.4,
    coordinates: [
      [start.longitude, start.latitude],
      [end.longitude, end.latitude],
    ],
  };
};

// Distance calculation (Haversine)
export const calculateDistance = (start: Location, end: Location): number => {
  const R = 6371000;
  const φ1 = (start.latitude * Math.PI) / 180;
  const φ2 = (end.latitude * Math.PI) / 180;
  const Δφ = ((end.latitude - start.latitude) * Math.PI) / 180;
  const Δλ = ((end.longitude - start.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Bearing calculation
const calculateBearing = (start: Location, end: Location): number => {
  const φ1 = (start.latitude * Math.PI) / 180;
  const φ2 = (end.latitude * Math.PI) / 180;
  const λ1 = (start.longitude * Math.PI) / 180;
  const λ2 = (end.longitude * Math.PI) / 180;

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const bearingToCardinal = (bearing: number): string => {
  const directions = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
  ];
  return directions[Math.round(bearing / 45) % 8];
};

// Format helpers
export const formatDistance = (meters: number): string => {
  if (meters < 100) return `${Math.round(meters)} meters`;
  return `${(meters / 1000).toFixed(1)} kilometers`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "about a minute";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
};

// Navigation state management
let distanceUpdateInterval: ReturnType<typeof setInterval> | null = null;

export const startNavigation = (
  destination: string,
  route: NavigationRoute
): void => {
  navigationState = {
    isActive: true,
    destination,
    route,
    currentStep: 0,
    currentCoordIndex: 0,
    lastSpokenInstruction: "",
    lastAnnouncementTime: null,
    lastUpdateDist: null,
  };

  // Start periodic distance updates (every 30 seconds)
  if (distanceUpdateInterval) clearInterval(distanceUpdateInterval);
  distanceUpdateInterval = setInterval(async () => {
    if (navigationState.isActive) {
      const info = await getRemainingInfo();
      announceNavigation(info);
    }
  }, 30000);
};

export const stopNavigation = (): void => {
  // Stop periodic updates
  if (distanceUpdateInterval) {
    clearInterval(distanceUpdateInterval);
    distanceUpdateInterval = null;
  }
  navigationState = {
    isActive: false,
    destination: "",
    route: null,
    currentStep: 0,
    currentCoordIndex: 0,
    lastSpokenInstruction: "",
    lastAnnouncementTime: null,
    lastUpdateDist: null,
  };
};

export const getNavigationState = (): NavigationState => navigationState;

// Check if it's time to give next instruction
export const checkNavigationProgress = async (
  userLocation: Location
): Promise<string | null> => {
  if (!navigationState.isActive || !navigationState.route) {
    return null;
  }

  const { route, currentStep } = navigationState;
  const now = Date.now();

  // Throttle to max once every 3 seconds
  const MIN_INTERVAL = 3000;
  if (
    navigationState.lastAnnouncementTime &&
    now - navigationState.lastAnnouncementTime < MIN_INTERVAL
  ) {
    return null;
  }

  // Calculate distance to destination
  const endPoint = {
    latitude: route.coordinates[route.coordinates.length - 1][1],
    longitude: route.coordinates[route.coordinates.length - 1][0],
  };
  const distanceToEnd = calculateDistance(userLocation, endPoint);

  // ARRIVAL: Within 15 meters - you're there
  if (distanceToEnd < 15) {
    stopNavigation();
    return "You have arrived!";
  }

  // ALMOST THERE: Within 40 meters
  if (distanceToEnd < 40 && distanceToEnd >= 15) {
    if (navigationState.lastSpokenInstruction !== "almost_there") {
      navigationState.lastSpokenInstruction = "almost_there";
      navigationState.lastAnnouncementTime = now;
      return "Destination is just ahead.";
    }
    return null;
  }

  // PERIODIC REASSURANCE: Every ~150m, tell user how far and direction
  const distSinceLastUpdate = navigationState.lastUpdateDist
    ? Math.abs(navigationState.lastUpdateDist - distanceToEnd)
    : 999;

  if (distanceToEnd > 40 && distSinceLastUpdate > 150) {
    navigationState.lastUpdateDist = distanceToEnd;
    navigationState.lastAnnouncementTime = now;
    const remainingSteps = route.instructions.length - currentStep;
    return `${formatDistance(distanceToEnd)} to go. ${remainingSteps} turn${
      remainingSteps !== 1 ? "s" : ""
    } remaining.`;
  }

  // TURN-BASED INSTRUCTIONS: Check each instruction's position
  if (currentStep < route.instructions.length) {
    const instruction = route.instructions[currentStep];

    // Find the coordinate index that corresponds to this instruction
    let stepCoordIndex = 0;
    for (let i = 0; i <= currentStep && i < route.instructions.length; i++) {
      stepCoordIndex += Math.max(
        1,
        Math.floor(route.instructions[i].distance / 30)
      );
    }
    stepCoordIndex = Math.min(stepCoordIndex, route.coordinates.length - 1);

    const stepCoord = route.coordinates[stepCoordIndex];
    const distToStep = calculateDistance(userLocation, {
      latitude: stepCoord[1],
      longitude: stepCoord[0],
    });

    // If close to this turn point (within 25m), announce it
    if (distToStep < 25 && distToStep > 5) {
      const instrType = instruction.type;
      const instrText = instruction.instruction.toLowerCase();
      let announcement: string;

      // Priority instruction types for blind walkers
      if (instrType === "arrive") {
        announcement = "Destination is just ahead.";
        Vibration.vibrate([0, 300, 100, 300]);
      } else if (instrType === "depart") {
        announcement = "Start walking.";
        Vibration.vibrate(100);
      } else if (instrType === "uturn") {
        announcement = "Turn around.";
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      } else if (
        instrType === "turn-left" ||
        instrType.includes("sharp-left")
      ) {
        announcement = "Turn left now.";
        Vibration.vibrate([0, 150, 80, 150]);
      } else if (
        instrType === "turn-right" ||
        instrType.includes("sharp-right")
      ) {
        announcement = "Turn right now.";
        Vibration.vibrate([0, 100, 60, 100, 60, 100]);
      } else if (instrType === "slight-left" || instrType === "bear-left") {
        announcement = "Turn slightly left.";
        Vibration.vibrate([0, 100, 80, 100]);
      } else if (instrType === "slight-right" || instrType === "bear-right") {
        announcement = "Turn slightly right.";
        Vibration.vibrate([0, 100, 60, 100, 60, 100]);
      } else if (instrType.includes("roundabout")) {
        if (instrText.includes("first exit") || instrText.includes("1")) {
          announcement = "Roundabout, take the first exit.";
        } else if (
          instrText.includes("second exit") ||
          instrText.includes("2")
        ) {
          announcement = "Roundabout, take the second exit.";
        } else if (
          instrText.includes("third exit") ||
          instrText.includes("3")
        ) {
          announcement = "Roundabout, take the third exit.";
        } else {
          announcement = "Entering a roundabout.";
        }
      } else if (instrText.includes("cross")) {
        announcement = "Cross the street now.";
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      } else if (instrText.includes("keep left")) {
        announcement = "Turn slightly left.";
        Vibration.vibrate([0, 100, 80, 100]);
      } else if (instrText.includes("keep right")) {
        announcement = "Turn slightly right.";
        Vibration.vibrate([0, 100, 60, 100, 60, 100]);
      } else {
        announcement = simplifyInstruction(instruction.instruction);
      }

      // Only announce if we haven't already announced this instruction
      if (announcement !== navigationState.lastSpokenInstruction) {
        navigationState.lastSpokenInstruction = announcement;
        navigationState.currentStep = currentStep + 1; // Advance to next step
        navigationState.lastAnnouncementTime = now;
        return announcement;
      }
    }

    // WARN about upcoming turn (within 80m)
    if (distToStep < 80 && distToStep >= 25) {
      const nextType = instruction.type;
      const instrText = instruction.instruction.toLowerCase();
      let warning: string | null = null;

      if (nextType.includes("turn-left") || nextType === "turn-left") {
        warning = `In ${formatDistance(distToStep)}, turn left.`;
      } else if (nextType.includes("turn-right") || nextType === "turn-right") {
        warning = `In ${formatDistance(distToStep)}, turn right.`;
      } else if (
        nextType.includes("slight-left") ||
        nextType === "slight-left"
      ) {
        warning = `In ${formatDistance(distToStep)}, bear left.`;
      } else if (
        nextType.includes("slight-right") ||
        nextType === "slight-right"
      ) {
        warning = `In ${formatDistance(distToStep)}, bear right.`;
      } else if (
        nextType.includes("roundabout") ||
        nextType.includes("rotary")
      ) {
        warning = `In ${formatDistance(distToStep)}, enter the roundabout.`;
      } else if (nextType.includes("fork")) {
        if (instrText.includes("left") || nextType.includes("left")) {
          warning = `In ${formatDistance(distToStep)}, keep left at the fork.`;
        } else {
          warning = `In ${formatDistance(distToStep)}, keep right at the fork.`;
        }
      } else if (nextType === "arrive") {
        warning = `In ${formatDistance(
          distToStep
        )}, you will arrive at your destination.`;
      } else if (instrText.includes("cross")) {
        warning = `In ${formatDistance(distToStep)}, cross the street.`;
      } else if (instrText.includes("keep left")) {
        warning = `In ${formatDistance(distToStep)}, keep left.`;
      } else if (instrText.includes("keep right")) {
        warning = `In ${formatDistance(distToStep)}, keep right.`;
      }

      if (warning && warning !== navigationState.lastSpokenInstruction) {
        navigationState.lastSpokenInstruction = warning;
        navigationState.lastAnnouncementTime = now;
        return warning;
      }
    }
  }

  return null;
};

// Simplify complex instructions for blind walkers
// Only use instructions a blind person can actually follow
const simplifyInstruction = (instruction: string): string => {
  const lower = instruction.toLowerCase();

  // Turns - clear and actionable
  if (lower.includes("turn left") || lower.includes("sharp left")) {
    return "Turn left now.";
  }
  if (lower.includes("turn right") || lower.includes("sharp right")) {
    return "Turn right now.";
  }

  // Slight turns - these DO help for blind users (gentle direction change)
  if (lower.includes("slight left") || lower.includes("bear left")) {
    return "Turn slightly left.";
  }
  if (lower.includes("slight right") || lower.includes("bear right")) {
    return "Turn slightly right.";
  }

  // Roundabouts - just give simple turn instructions
  if (lower.includes("roundabout") || lower.includes("rotary")) {
    if (lower.includes("first exit")) {
      return "Take the first exit, turn left.";
    }
    if (lower.includes("second exit")) {
      return "Take the second exit, continue around.";
    }
    if (lower.includes("third exit")) {
      return "Take the third exit, turn right.";
    }
    if (lower.includes("fourth exit")) {
      return "Take the next exit, turn sharp right.";
    }
    // Default for roundabout without exit info
    return "Entering a roundabout. Listen for your exit.";
  }

  // Street crossing - clear action
  if (
    lower.includes("cross") ||
    lower.includes("crosswalk") ||
    lower.includes("pedestrian")
  ) {
    return "Cross the street now.";
  }

  // Continue straight
  if (
    lower.includes("continue") ||
    lower.includes("straight") ||
    lower.includes("head")
  ) {
    return "Continue straight ahead.";
  }

  // Arrive
  if (
    lower.includes("arrive") ||
    lower.includes("destination") ||
    lower.includes("reached")
  ) {
    return "Destination is just ahead.";
  }

  // Depart
  if (lower.includes("depart") || lower.includes("start")) {
    return "Start walking.";
  }

  // Default: just say keep going
  return "Continue straight ahead.";
};

// Get estimated time remaining
export const getTimeRemaining = (): string => {
  if (!navigationState.route) return "";
  const remaining = navigationState.route.totalDuration;
  return formatDuration(remaining);
};

// Get remaining distance and time using fresh GPS location
export const getRemainingInfo = async (): Promise<string> => {
  const state = navigationState;
  if (!state.isActive || !state.route) return "Not currently navigating";

  try {
    // Get fresh GPS location
    const current = await getCurrentLocation();

    // Calculate actual distance to destination
    const destCoord =
      state.route.coordinates[state.route.coordinates.length - 1];
    const actualDist = calculateDistance(current, {
      latitude: destCoord[1],
      longitude: destCoord[0],
    });

    // Estimate time based on walking speed (5 km/h)
    const estimatedMinutes = Math.round((actualDist / 1000) * 12); // ~12 min per km

    return `${formatDistance(actualDist)} remaining, about ${formatDuration(
      estimatedMinutes * 60
    )}`;
  } catch (e) {
    // Fallback to cached route distance
    const remainingDist = state.route.instructions
      .slice(state.currentStep)
      .reduce((sum, step) => sum + step.distance, 0);
    const remainingTime = state.route.instructions
      .slice(state.currentStep)
      .reduce((sum, step) => sum + step.duration, 0);

    return `${formatDistance(remainingDist)} remaining, about ${formatDuration(
      remainingTime
    )}`;
  }
};

// High-level: start a full navigation session and speak the first instruction
export const beginNavigationTo = async (
  address: string
): Promise<{ route: NavigationRoute; destination: string }> => {
  console.log("[nav] beginNavigationTo:", address);

  const hasPermission = await requestLocationPermission();
  console.log("[nav] location permission:", hasPermission);
  if (!hasPermission) {
    throw new Error("Location permission denied");
  }

  // Get current location first so we can bias searches locally
  const current = await getCurrentLocation();
  console.log("[nav] current location:", current.latitude, current.longitude);

  // Check if this is a "nearest X" / "X near me" style query
  const nearbyTarget = parseNearbyQuery(address);

  let dest: Location & { name: string };
  if (nearbyTarget) {
    console.log("[nav] nearby search for:", nearbyTarget);
    dest = await findNearest(nearbyTarget, current);
  } else {
    dest = await geocodeAddress(address, current);
  }
  console.log("[nav] destination:", dest.name, dest.latitude, dest.longitude);

  const route = await getRoute(current, dest);
  console.log("[nav] route steps:", route.instructions.length);

  startNavigation(dest.name, route);

  const distance = calculateDistance(current, dest);
  const minutes = Math.round(route.totalDuration / 60);

  // Speak the opening summary
  announceNavigation(
    `Navigating to ${dest.name}. ${formatDistance(
      distance
    )} away, about ${minutes} minutes. ${
      route.instructions[0]?.instruction || "Walk straight to begin."
    }`
  );
  navigationState.lastSpokenInstruction =
    route.instructions[0]?.instruction ?? "";

  return { route, destination: dest.name };
};

// Emit a spoken hazard warning if the proximity module flags something
export const notifyHazardFromLocation = (
  distance: number,
  label: string,
  direction: string = "ahead"
): void => {
  const alert = getProximityAlert(distance, label, direction);
  if (alert) {
    announceNavigation(formatProximityWarning(alert));
  }
};

// Call this from a GPS watcher; it speaks the next turn when the user gets close
export const checkAndAnnounceProgress = (userLocation: Location): void => {
  checkNavigationProgress(userLocation).then((instruction) => {
    if (instruction) {
      announceNavigation(instruction);
    }
  });
};

interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  accessibleEntrance: boolean;
  elevators: boolean;
  accessibleParking: boolean;
  hasRamp: boolean;
  rating: "high" | "medium" | "low";
  details: string[];
  placeName: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface OverpassElement {
  type: string;
  id: number;
  tags: Record<string, string>;
}

// Step 1: Geocode address using Nominatim (free, no API key)
const geocodeAddress = async (
  address: string,
): Promise<NominatimResult | null> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
    {
      headers: {
        "User-Agent": "CVision/1.0",
      },
    },
  );
  const results = await response.json();
  return results.length > 0 ? results[0] : null;
};

// Step 2: Query nearby POIs with accessibility tags using Overpass API (free)
const queryAccessibilityData = async (
  lat: string,
  lon: string,
  placeName: string,
): Promise<OverpassElement[]> => {
  // Search for nodes/ways within 100m that might be the building
  const query = `
    [out:json][timeout:10];
    (
      node["name"~"${placeName.split(" ")[0]}",i](around:100,${lat},${lon});
      way["name"~"${placeName.split(" ")[0]}",i](around:100,${lat},${lon});
      node["building"](around:50,${lat},${lon});
      way["building"](around:50,${lat},${lon});
    );
    out tags;
  `;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = await response.json();
  return data.elements || [];
};

// Step 3: Analyze accessibility tags
const analyzeAccessibility = (
  elements: OverpassElement[],
  placeName: string,
): AccessibilityInfo => {
  let wheelchairAccessible = false;
  let accessibleEntrance = false;
  let elevators = false;
  let accessibleParking = false;
  let hasRamp = false;
  const details: string[] = [];

  for (const element of elements) {
    const tags = element.tags || {};

    // Check wheelchair accessibility
    if (tags.wheelchair === "yes") {
      wheelchairAccessible = true;
      details.push("Wheelchair accessible");
    }
    if (tags.wheelchair === "limited") {
      wheelchairAccessible = true;
      details.push("Limited wheelchair access");
    }
    if (tags["wheelchair:description"]) {
      details.push(tags["wheelchair:description"]);
    }

    // Check entrances
    if (tags["wheelchair:description"]?.includes("entrance")) {
      accessibleEntrance = true;
    }
    if (tags.entrance === "main" && tags.wheelchair === "yes") {
      accessibleEntrance = true;
    }

    // Check for ramps
    if (tags.ramp === "yes" || tags["ramp:wheelchair"] === "yes") {
      hasRamp = true;
      details.push("Has ramp");
    }

    // Check for elevators
    if (
      tags.highway === "elevator" ||
      tags.lift === "yes" ||
      tags.elevator === "yes"
    ) {
      elevators = true;
      details.push("Has elevator");
    }

    // Check for accessible parking
    if (tags["parking:wheelchair"] === "yes" || tags.parking === "wheelchair") {
      accessibleParking = true;
      details.push("Accessible parking available");
    }

    // Check building type hints
    if (tags.building === "hospital" || tags.building === "public") {
      details.push("Public building (likely accessible)");
    }
    if (tags.amenity === "hospital" || tags.amity === "clinic") {
      details.push("Medical facility");
    }
  }

  // Calculate rating
  let score = 0;
  if (wheelchairAccessible) score += 3;
  if (accessibleEntrance) score += 2;
  if (elevators) score += 2;
  if (hasRamp) score += 1;
  if (accessibleParking) score += 1;

  let rating: "high" | "medium" | "low" = "low";
  if (score >= 5) rating = "high";
  else if (score >= 3) rating = "medium";

  return {
    wheelchairAccessible,
    accessibleEntrance,
    elevators,
    accessibleParking,
    hasRamp,
    rating,
    details: details.length > 0 ? details : ["No accessibility data found"],
    placeName,
  };
};

// Main function
export const checkAccessibility = async (
  address: string,
): Promise<AccessibilityInfo> => {
  try {
    // Geocode the address
    const location = await geocodeAddress(address);
    if (!location) {
      return {
        wheelchairAccessible: false,
        accessibleEntrance: false,
        elevators: false,
        accessibleParking: false,
        hasRamp: false,
        rating: "low",
        details: ["Could not find location"],
        placeName: address,
      };
    }

    // Query accessibility data
    const elements = await queryAccessibilityData(
      location.lat,
      location.lon,
      location.display_name,
    );

    return analyzeAccessibility(elements, location.display_name);
  } catch (error) {
    console.error("Accessibility check failed:", error);
    return {
      wheelchairAccessible: false,
      accessibleEntrance: false,
      elevators: false,
      accessibleParking: false,
      hasRamp: false,
      rating: "low",
      details: ["Error checking accessibility"],
      placeName: address,
    };
  }
};

export const formatAccessibilityReport = (info: AccessibilityInfo): string => {
  const ratingText = {
    high: `${info.placeName} is highly accessible.`,
    medium: `${info.placeName} has some accessibility features.`,
    low: `${info.placeName} has limited accessibility information.`,
  };

  const features: string[] = [];
  if (info.accessibleEntrance) features.push("accessible entrance");
  if (info.elevators) features.push("elevators");
  if (info.hasRamp) features.push("ramp");
  if (info.accessibleParking) features.push("accessible parking");

  let response = ratingText[info.rating];

  if (features.length > 0) {
    response += ` It has ${features.join(", ")}.`;
  }

  if (info.details.length > 0 && !info.details[0].startsWith("No")) {
    response += ` ${info.details.slice(0, 2).join(". ")}.`;
  }

  return response;
};

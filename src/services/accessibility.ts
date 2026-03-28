import { API_KEYS } from "../constants/config";

interface AccessibilityInfo {
  wheelchairAccessible: boolean;
  accessibleEntrance: boolean;
  elevators: boolean;
  accessibleParking: boolean;
  rating: "high" | "medium" | "low";
  details: string[];
}

export const checkAccessibility = async (
  address: string,
): Promise<AccessibilityInfo> => {
  const API_KEY = API_KEYS.GOOGLE_PLACES;

  // First, find the place
  const searchResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(address)}&inputtype=textquery&fields=place_id,name&key=${API_KEY}`,
  );
  const searchData = await searchResponse.json();

  if (!searchData.candidates?.[0]?.place_id) {
    return {
      wheelchairAccessible: false,
      accessibleEntrance: false,
      elevators: false,
      accessibleParking: false,
      rating: "low",
      details: ["Could not find location"],
    };
  }

  const placeId = searchData.candidates[0].place_id;

  // Get detailed accessibility info
  const detailsResponse = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=wheelchair_accessible_entrance,accessibility,reviews&key=${API_KEY}`,
  );
  const detailsData = await detailsResponse.json();

  const result = detailsData.result;
  const details =
    result.reviews
      ?.filter((r: any) => r.text?.toLowerCase().includes("accessib"))
      .map((r: any) => r.text)
      .slice(0, 3) || [];

  const hasEntrance = result.wheelchair_accessible_entrance ?? false;
  const accessibilityOptions = result.accessibility || [];

  const accessibleParking = accessibilityOptions.includes(
    "wheelchair_accessible_parking",
  );
  const elevators = accessibilityOptions.includes("elevator");

  let rating: "high" | "medium" | "low" = "low";
  let score = 0;

  if (hasEntrance) score += 3;
  if (elevators) score += 2;
  if (accessibleParking) score += 1;
  if (details.length > 0) score += 1;

  if (score >= 4) rating = "high";
  else if (score >= 2) rating = "medium";

  return {
    wheelchairAccessible: hasEntrance,
    accessibleEntrance: hasEntrance,
    elevators,
    accessibleParking,
    rating,
    details,
  };
};

export const formatAccessibilityReport = (info: AccessibilityInfo): string => {
  const ratingText = {
    high: "This building is highly accessible.",
    medium: "This building has limited accessibility features.",
    low: "Accessibility information is limited. Proceed with caution.",
  };

  const features: string[] = [];
  if (info.accessibleEntrance) features.push("accessible entrance");
  if (info.elevators) features.push("elevators");
  if (info.accessibleParking) features.push("accessible parking");

  let response = ratingText[info.rating];

  if (features.length > 0) {
    response += ` It has ${features.join(", ")}.`;
  }

  if (info.details.length > 0) {
    response += ` Reviews mention: ${info.details[0].substring(0, 100)}`;
  }

  return response;
};

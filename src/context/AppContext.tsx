import React, { createContext, useContext, useReducer, ReactNode } from "react";

interface AccessibilityFeatures {
  wheelchairAccessible?: boolean;
  accessibleEntrance?: boolean;
  elevators?: boolean;
  accessibleParking?: boolean;
}

interface NotificationState {
  show: boolean;
  rating: "high" | "medium" | "low" | null;
  location: string;
  features: string[];
  timestamp: number | null;
}

interface AppState {
  isAnalyzing: boolean;
  currentDescription: string | null;
  currentDangers: string[];
  accessibilityRating: "high" | "medium" | "low" | null;
  lastLocation: string | null;
  accessibilityFeatures: AccessibilityFeatures;
  accessibilityDetails: string[];
  notification: NotificationState;
  screenReaderEnabled: boolean;
  speechRate: number;
  hapticEnabled: boolean;
}

type AppAction =
  | { type: "START_ANALYZING" }
  | { type: "STOP_ANALYZING" }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_DANGERS"; payload: string[] }
  | { type: "SET_ACCESSIBILITY"; payload: { rating: "high" | "medium" | "low"; features: AccessibilityFeatures; details: string[] } }
  | { type: "SET_LOCATION"; payload: string }
  | { type: "SHOW_NOTIFICATION"; payload: { rating: "high" | "medium" | "low"; location: string; features: string[] } }
  | { type: "HIDE_NOTIFICATION" }
  | { type: "SET_SCREEN_READER"; payload: boolean }
  | { type: "SET_SPEECH_RATE"; payload: number }
  | { type: "SET_HAPTIC_ENABLED"; payload: boolean };

const initialState: AppState = {
  isAnalyzing: false,
  currentDescription: null,
  currentDangers: [],
  accessibilityRating: null,
  lastLocation: null,
  accessibilityFeatures: {},
  accessibilityDetails: [],
  notification: {
    show: false,
    rating: null,
    location: "",
    features: [],
    timestamp: null,
  },
  screenReaderEnabled: false,
  speechRate: 0.5,
  hapticEnabled: true,
};

const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "START_ANALYZING":
      return { ...state, isAnalyzing: true };
    case "STOP_ANALYZING":
      return { ...state, isAnalyzing: false };
    case "SET_DESCRIPTION":
      return { ...state, currentDescription: action.payload };
    case "SET_DANGERS":
      return { ...state, currentDangers: action.payload };
    case "SET_ACCESSIBILITY":
      return {
        ...state,
        accessibilityRating: action.payload.rating,
        accessibilityFeatures: action.payload.features,
        accessibilityDetails: action.payload.details,
      };
    case "SET_LOCATION":
      return { ...state, lastLocation: action.payload };
    case "SHOW_NOTIFICATION":
      return {
        ...state,
        notification: {
          show: true,
          rating: action.payload.rating,
          location: action.payload.location,
          features: action.payload.features,
          timestamp: Date.now(),
        },
      };
    case "HIDE_NOTIFICATION":
      return {
        ...state,
        notification: { ...state.notification, show: false },
      };
    case "SET_SCREEN_READER":
      return { ...state, screenReaderEnabled: action.payload };
    case "SET_SPEECH_RATE":
      return { ...state, speechRate: action.payload };
    case "SET_HAPTIC_ENABLED":
      return { ...state, hapticEnabled: action.payload };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};

export const useAccessibilityFeatures = () => {
  const { state } = useAppContext();

  const getFeaturesArray = (): string[] => {
    const features: string[] = [];
    if (state.accessibilityFeatures.wheelchairAccessible) {
      features.push("Wheelchair accessible");
    }
    if (state.accessibilityFeatures.accessibleEntrance) {
      features.push("Accessible entrance");
    }
    if (state.accessibilityFeatures.elevators) {
      features.push("Elevators available");
    }
    if (state.accessibilityFeatures.accessibleParking) {
      features.push("Accessible parking");
    }
    return features;
  };

  return {
    features: getFeaturesArray(),
    rating: state.accessibilityRating,
    details: state.accessibilityDetails,
    isAnalyzing: state.isAnalyzing,
  };
};

export const useAccessibilityNotifications = () => {
  const { state, dispatch } = useAppContext();

  const showRatingNotification = (
    rating: "high" | "medium" | "low",
    location: string,
    features: string[],
  ) => {
    dispatch({
      type: "SHOW_NOTIFICATION",
      payload: { rating, location, features },
    });
  };

  const hideNotification = () => {
    dispatch({ type: "HIDE_NOTIFICATION" });
  };

  return {
    notification: state.notification,
    showRatingNotification,
    hideNotification,
  };
};

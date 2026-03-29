import React, { createContext, useContext, useReducer, ReactNode } from "react";

interface AppState {
  isAnalyzing: boolean;
  currentDescription: string | null;
  currentDangers: string[];
  accessibilityRating: "high" | "medium" | "low" | null;
  lastLocation: string | null;
}

type AppAction =
  | { type: "START_ANALYZING" }
  | { type: "STOP_ANALYZING" }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_DANGERS"; payload: string[] }
  | { type: "SET_ACCESSIBILITY"; payload: "high" | "medium" | "low" }
  | { type: "SET_LOCATION"; payload: string };

const initialState: AppState = {
  isAnalyzing: false,
  currentDescription: null,
  currentDangers: [],
  accessibilityRating: null,
  lastLocation: null,
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
      return { ...state, accessibilityRating: action.payload };
    case "SET_LOCATION":
      return { ...state, lastLocation: action.payload };
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

import { createContext } from "react";

export type PreferencesContextValue = {
  miniNavEnabled: boolean;
  setMiniNavEnabled: (val: boolean) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

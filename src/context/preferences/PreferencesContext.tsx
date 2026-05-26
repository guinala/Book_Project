import { useState } from "react";
import type { ReactNode } from "react";
import { PreferencesContext } from "./preferences_init";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [miniNavEnabled, setMiniNavEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("pref_miniNav") === "true";
  });

  const setMiniNavEnabled = (val: boolean) => {
    localStorage.setItem("pref_miniNav", String(val));
    setMiniNavEnabledState(val);
  };

  return (
    <PreferencesContext.Provider value={{ miniNavEnabled, setMiniNavEnabled }}>
      {children}
    </PreferencesContext.Provider>
  );
}

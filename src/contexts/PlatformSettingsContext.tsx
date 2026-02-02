import { createContext, useContext, ReactNode } from "react";
import { usePlatformSettings, PlatformSettingsReturn } from "@/hooks/usePlatformSettings";

const PlatformSettingsContext = createContext<PlatformSettingsReturn | null>(null);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const platformSettings = usePlatformSettings();
  
  return (
    <PlatformSettingsContext.Provider value={platformSettings}>
      {children}
    </PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettingsContext() {
  const context = useContext(PlatformSettingsContext);
  if (!context) {
    throw new Error("usePlatformSettingsContext must be used within PlatformSettingsProvider");
  }
  return context;
}

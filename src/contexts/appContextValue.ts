import { createContext } from "react";
import type { AppSettings } from "../types/settings.ts";

export interface AppContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

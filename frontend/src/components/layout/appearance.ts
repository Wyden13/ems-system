import { createContext, useContext } from "react";

export type Appearance = "light" | "dark" | "system";
export const AppearanceContext = createContext<{ appearance: Appearance; setAppearance: (value: Appearance) => void }>({ appearance: "system", setAppearance: () => {} });
export const useAppearance = () => useContext(AppearanceContext);


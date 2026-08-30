/** App theme — dark only. Stamped on <html data-theme> so CSS tokens and
 *  useChartTheme() (keyed on this mode) resolve without a light branch. */
import { createContext, useContext, useEffect, type ReactNode } from "react";

export type ThemeMode = "dark";

const ThemeContext = createContext<{ mode: ThemeMode }>({ mode: "dark" });

export function ThemeProvider(props: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  return <ThemeContext.Provider value={{ mode: "dark" }}>{props.children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

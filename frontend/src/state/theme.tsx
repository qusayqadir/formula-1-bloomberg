/** App theme (dark / light). The mode is stamped on <html data-theme> so
 *  every CSS token follows instantly; charts re-render through
 *  useChartTheme(), whose token bundle is keyed on this mode. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "f1-theme";

const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void; set: (m: ThemeMode) => void }>({
  mode: "dark",
  toggle: () => {},
  set: () => {},
});

function initialMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

export function ThemeProvider(props: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return (
    <ThemeContext.Provider
      value={{ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")), set: setMode }}
    >
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { UI_CONFIG } from "@/config/ui.config";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectTheme, setTheme } from "@/store/slices/uiSlice";

interface ThemeContextValue {
  isDarkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const themeSetting = useAppSelector(selectTheme); // 'light' | 'dark' | 'system'

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (themeSetting === "dark") return true;
    if (themeSetting === "light") return false;
    return getSystemPrefersDark();
  });

  // Sync with Redux theme changes and system preference if 'system'
  useEffect(() => {
    if (themeSetting === "dark") setIsDarkMode(true);
    else if (themeSetting === "light") setIsDarkMode(false);
    else setIsDarkMode(getSystemPrefersDark());
  }, [themeSetting]);

  // Apply Tailwind dark class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDarkMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDarkMode,
      setDarkMode: (val) => {
        setIsDarkMode(val);
        dispatch(setTheme(val ? "dark" : "light"));
        localStorage.setItem("theme", val ? "dark" : "light");
      },
    }),
    [isDarkMode, dispatch],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return ctx;
}

export function useUIConfig() {
  const { isDarkMode } = useThemeMode();
  return UI_CONFIG(isDarkMode);
}

"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { ColorTheme, applyColorTheme } from "@/lib/color-themes";

const STORAGE_KEY = "marcenaria-color-theme";

interface ColorThemeContextType {
    colorTheme: ColorTheme;
    setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType>({
    colorTheme: "blue",
    setColorTheme: () => {},
});

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = (localStorage.getItem(STORAGE_KEY) as ColorTheme) || "blue";
        setColorThemeState(saved);
    }, []);

    // Re-apply whenever color or dark/light mode changes
    useEffect(() => {
        if (!mounted) return;
        applyColorTheme(colorTheme, resolvedTheme === "dark");
    }, [colorTheme, resolvedTheme, mounted]);

    const setColorTheme = useCallback((theme: ColorTheme) => {
        setColorThemeState(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, []);

    return (
        <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
            {children}
        </ColorThemeContext.Provider>
    );
}

export function useColorTheme() {
    return useContext(ColorThemeContext);
}

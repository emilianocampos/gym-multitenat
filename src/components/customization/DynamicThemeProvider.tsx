'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { GymSettings, ThemeMode } from '@/types/database';

interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  themeMode: ThemeMode;
  gradientEnabled: boolean;
  gradientStart: string;
  gradientEnd: string;
}

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: React.Dispatch<React.SetStateAction<ThemeConfig>>;
  applySettings: (settings: Partial<GymSettings>) => void;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#CCFF00',
  backgroundColor: '#0B0B0E',
  surfaceColor: '#141418',
  themeMode: 'DARK',
  gradientEnabled: true,
  gradientStart: '#CCFF00',
  gradientEnd: '#88FF00',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  applySettings: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function DynamicThemeProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<GymSettings> | null;
}) {
  const [theme, setTheme] = useState<ThemeConfig>(() => ({
    primaryColor: initialSettings?.primary_color || defaultTheme.primaryColor,
    backgroundColor: initialSettings?.background_color || defaultTheme.backgroundColor,
    surfaceColor: initialSettings?.surface_color || defaultTheme.surfaceColor,
    themeMode: initialSettings?.theme || defaultTheme.themeMode,
    gradientEnabled: initialSettings?.gradient_enabled ?? defaultTheme.gradientEnabled,
    gradientStart: initialSettings?.gradient_color_start || defaultTheme.gradientStart,
    gradientEnd: initialSettings?.gradient_color_end || defaultTheme.gradientEnd,
  }));

  const applySettings = (settings: Partial<GymSettings>) => {
    setTheme((prev) => ({
      ...prev,
      primaryColor: settings.primary_color ?? prev.primaryColor,
      backgroundColor: settings.background_color ?? prev.backgroundColor,
      surfaceColor: settings.surface_color ?? prev.surfaceColor,
      themeMode: settings.theme ?? prev.themeMode,
      gradientEnabled: settings.gradient_enabled ?? prev.gradientEnabled,
      gradientStart: settings.gradient_color_start ?? prev.gradientStart,
      gradientEnd: settings.gradient_color_end ?? prev.gradientEnd,
    }));
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--gym-primary', theme.primaryColor);
    root.style.setProperty('--gym-bg', theme.backgroundColor);
    root.style.setProperty('--gym-surface', theme.surfaceColor);
    root.style.setProperty('--gym-card', theme.surfaceColor);

    if (theme.themeMode === 'LIGHT') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applySettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

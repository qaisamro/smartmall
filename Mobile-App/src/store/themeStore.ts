import { create } from 'zustand';

export type AppTheme = 'light' | 'dark';

interface ThemeState {
  themeOverride: AppTheme | null;
  setThemeOverride: (theme: AppTheme) => void;
  clearThemeOverride: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeOverride: null,
  setThemeOverride: (themeOverride) => set({ themeOverride }),
  clearThemeOverride: () => set({ themeOverride: null }),
}));
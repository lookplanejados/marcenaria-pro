export type ColorTheme = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'black';

export interface ThemeConfig {
    label: string;
    value: ColorTheme;
    swatch: string; // Tailwind bg color for the swatch button
    // CSS HSL values (light mode primary, dark mode primary)
    lightPrimary: string;
    darkPrimary: string;
    lightRing: string;
    darkRing: string;
}

export const COLOR_THEMES: ThemeConfig[] = [
    {
        label: 'Azul',
        value: 'blue',
        swatch: 'bg-blue-600',
        lightPrimary: '221.2 83.2% 53.3%',
        darkPrimary:  '217.2 91.2% 59.8%',
        lightRing:    '221.2 83.2% 53.3%',
        darkRing:     '224.3 76.3% 48%',
    },
    {
        label: 'Verde',
        value: 'green',
        swatch: 'bg-emerald-600',
        lightPrimary: '142.1 76.2% 36.3%',
        darkPrimary:  '142.1 70.6% 45.3%',
        lightRing:    '142.1 76.2% 36.3%',
        darkRing:     '142.1 70.6% 45.3%',
    },
    {
        label: 'Vermelho',
        value: 'red',
        swatch: 'bg-red-600',
        lightPrimary: '0 72.2% 50.6%',
        darkPrimary:  '0 72.2% 60.6%',
        lightRing:    '0 72.2% 50.6%',
        darkRing:     '0 72.2% 60.6%',
    },
    {
        label: 'Laranja',
        value: 'orange',
        swatch: 'bg-orange-500',
        lightPrimary: '24.6 95% 53.1%',
        darkPrimary:  '20.5 90.2% 57.7%',
        lightRing:    '24.6 95% 53.1%',
        darkRing:     '20.5 90.2% 57.7%',
    },
    {
        label: 'Roxo',
        value: 'purple',
        swatch: 'bg-purple-600',
        lightPrimary: '270 67.5% 47.1%',
        darkPrimary:  '270 67.5% 60%',
        lightRing:    '270 67.5% 47.1%',
        darkRing:     '270 67.5% 60%',
    },
    {
        label: 'Preto',
        value: 'black',
        swatch: 'bg-zinc-900',
        lightPrimary: '220 8.9% 18%',
        darkPrimary:  '220 8.9% 75%',
        lightRing:    '220 8.9% 18%',
        darkRing:     '220 8.9% 75%',
    },
];

export function getThemeConfig(value: ColorTheme): ThemeConfig {
    return COLOR_THEMES.find(t => t.value === value) ?? COLOR_THEMES[0];
}

export function applyColorTheme(value: ColorTheme, isDark: boolean) {
    const config = getThemeConfig(value);
    const root = document.documentElement;
    root.style.setProperty('--primary', isDark ? config.darkPrimary : config.lightPrimary);
    root.style.setProperty('--ring',    isDark ? config.darkRing    : config.lightRing);
    // primary-foreground stays white for all dark primaries
    root.style.setProperty('--primary-foreground', isDark ? '222.2 47.4% 11.2%' : '210 40% 98%');
    // Store on element for persistence across theme switches
    root.setAttribute('data-color-theme', value);
}

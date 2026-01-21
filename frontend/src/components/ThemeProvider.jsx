import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Converts hex color to RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 136, g: 66, b: 240 }; // Default purple
}

/**
 * Adjusts color brightness (positive = lighter, negative = darker)
 */
function adjustBrightness(r, g, b, percent) {
  const amt = Math.round(2.55 * percent);
  return {
    r: Math.min(255, Math.max(0, r + amt)),
    g: Math.min(255, Math.max(0, g + amt)),
    b: Math.min(255, Math.max(0, b + amt))
  };
}

/**
 * Calculate relative luminance of a color
 * Used to determine if text should be light or dark for contrast
 */
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determines if a color is light or dark
 * Returns 'light' or 'dark' for appropriate text color
 */
function getContrastingTextColor(r, g, b) {
  const luminance = getLuminance(r, g, b);
  // If background is dark (low luminance), use light text
  return luminance > 0.5 ? 'dark' : 'light';
}

export default function ThemeProvider({ children }) {
  const { company } = useAuth();

  useEffect(() => {
    if (!company?.primary_color) {
      console.log('ThemeProvider: No company or primary_color yet', { company });
      return;
    }

    const primaryColor = company.primary_color;
    const backgroundColor = company.background_color || '#f5f5f5';
    const sidebarColor = company.sidebar_color || '#ffffff';

    console.log('ThemeProvider: Applying colors', { primaryColor, backgroundColor, sidebarColor });
    const rgb = hexToRgb(primaryColor);

    // Generate color shades (50-900 scale like Tailwind)
    const shades = {
      50: adjustBrightness(rgb.r, rgb.g, rgb.b, 90),   // Very light
      100: adjustBrightness(rgb.r, rgb.g, rgb.b, 75),
      200: adjustBrightness(rgb.r, rgb.g, rgb.b, 50),
      300: adjustBrightness(rgb.r, rgb.g, rgb.b, 25),
      400: adjustBrightness(rgb.r, rgb.g, rgb.b, 10),
      500: rgb,                                        // Base color
      600: adjustBrightness(rgb.r, rgb.g, rgb.b, -10),
      700: adjustBrightness(rgb.r, rgb.g, rgb.b, -25),
      800: adjustBrightness(rgb.r, rgb.g, rgb.b, -40),
      900: adjustBrightness(rgb.r, rgb.g, rgb.b, -55)  // Very dark
    };

    // Inject CSS variables into root
    const root = document.documentElement;
    Object.entries(shades).forEach(([shade, color]) => {
      const cssValue = `${color.r} ${color.g} ${color.b}`;
      root.style.setProperty(`--brand-${shade}`, cssValue);
      console.log(`Set --brand-${shade}: ${cssValue}`);
    });

    // Apply background and sidebar colors
    const bgRgb = hexToRgb(backgroundColor);
    const sidebarRgb = hexToRgb(sidebarColor);

    root.style.setProperty('--bg-color', `${bgRgb.r} ${bgRgb.g} ${bgRgb.b}`);
    root.style.setProperty('--sidebar-color', `${sidebarRgb.r} ${sidebarRgb.g} ${sidebarRgb.b}`);

    // Auto-calculate contrasting text colors for primary, background, and sidebar
    const primaryTextContrast = getContrastingTextColor(rgb.r, rgb.g, rgb.b);
    const bgTextContrast = getContrastingTextColor(bgRgb.r, bgRgb.g, bgRgb.b);
    const sidebarTextContrast = getContrastingTextColor(sidebarRgb.r, sidebarRgb.g, sidebarRgb.b);

    // Set text colors (255 255 255 for white, 0 0 0 for black)
    root.style.setProperty('--brand-text', primaryTextContrast === 'light' ? '255 255 255' : '0 0 0');
    root.style.setProperty('--bg-text', bgTextContrast === 'light' ? '255 255 255' : '0 0 0');
    root.style.setProperty('--sidebar-text', sidebarTextContrast === 'light' ? '255 255 255' : '17 24 39'); // gray-900 for light sidebar

    console.log('ThemeProvider: All colors applied successfully', {
      primaryTextContrast,
      bgTextContrast,
      sidebarTextContrast
    });
  }, [company?.primary_color, company?.background_color, company?.sidebar_color]);

  return children;
}

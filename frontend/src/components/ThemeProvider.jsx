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

export default function ThemeProvider({ children }) {
  const { company } = useAuth();

  useEffect(() => {
    if (!company?.primary_color) {
      console.log('ThemeProvider: No company or primary_color yet', { company });
      return;
    }

    const primaryColor = company.primary_color;
    console.log('ThemeProvider: Applying color', primaryColor);
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

    console.log('ThemeProvider: Colors applied successfully');
  }, [company?.primary_color]);

  return children;
}

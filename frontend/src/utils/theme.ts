/**
 * Theme utilities for Jarvis Coder
 * Handles theme switching, glassmorphic styles, and color management
 */

import type { Theme } from '../types';

export const lightTheme: Theme = {
  name: 'Light',
  mode: 'light',
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

export const darkTheme: Theme = {
  name: 'Dark',
  mode: 'dark',
  colors: {
    primary: '#3b82f6',
    secondary: '#6366f1',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
};

export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Apply theme class
  root.classList.remove('light', 'dark');
  root.classList.add(theme.mode);
  
  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme.colors.background);
  }
};

export const getThemeFromMode = (mode: 'light' | 'dark' | 'system'): Theme => {
  if (mode === 'system') {
    return getSystemTheme() === 'dark' ? darkTheme : lightTheme;
  }
  return mode === 'dark' ? darkTheme : lightTheme;
};

// Glassmorphic style utilities
export const glassmorphicStyles = {
  panel: 'backdrop-blur-xl bg-white/5 border border-white/20 shadow-lg rounded-2xl',
  card: 'backdrop-blur-lg bg-white/10 border border-white/20 shadow-md rounded-xl',
  button: 'backdrop-blur-md bg-white/20 border border-white/30 shadow-sm rounded-lg',
  input: 'backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg',
  overlay: 'backdrop-blur-2xl bg-black/20',
};

export const getGlassmorphicClass = (variant: keyof typeof glassmorphicStyles, isDark = true) => {
  const base = glassmorphicStyles[variant];
  if (!isDark) {
    return base.replace(/bg-white\/\d+/g, 'bg-black/5').replace(/border-white\/\d+/g, 'border-black/10');
  }
  return base;
};

// Animation utilities
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  bounce: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.3 },
    transition: { 
      duration: 0.5, 
      ease: [0.68, -0.55, 0.265, 1.55] 
    },
  },
};

// Color utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const adjustOpacity = (color: string, opacity: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

export const lighten = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  
  return rgbToHex(r, g, b);
};

export const darken = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  
  return rgbToHex(r, g, b);
};

// Gradient utilities
export const gradients = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600',
  secondary: 'bg-gradient-to-r from-purple-500 to-pink-500',
  success: 'bg-gradient-to-r from-green-400 to-blue-500',
  warning: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  error: 'bg-gradient-to-r from-red-400 to-pink-500',
  glass: 'bg-gradient-to-br from-white/20 to-white/5',
  glassDark: 'bg-gradient-to-br from-black/20 to-black/5',
};

export const getGradientClass = (variant: keyof typeof gradients) => {
  return gradients[variant];
};

// Shadow utilities
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  glass: 'shadow-lg shadow-black/10',
  glassHover: 'shadow-xl shadow-black/20',
  glow: 'shadow-lg shadow-blue-500/25',
  glowHover: 'shadow-xl shadow-blue-500/40',
};

export const getShadowClass = (variant: keyof typeof shadows) => {
  return shadows[variant];
};
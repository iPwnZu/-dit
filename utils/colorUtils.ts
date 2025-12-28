import { CMYK } from '../types';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  let cleanHex = hex.replace('#', '');
  // Handle shorthand hex like #f00
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  // Default to black if invalid
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      return { r: 0, g: 0, b: 0 };
  }

  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const rgbToCmyk = (r: number, g: number, b: number): CMYK => {
  let c = 0;
  let m = 0;
  let y = 0;
  let k = 0;

  if (r === 0 && g === 0 && b === 0) {
    k = 100;
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  c = 1 - (r / 255);
  m = 1 - (g / 255);
  y = 1 - (b / 255);

  const minCMY = Math.min(c, Math.min(m, y));
  
  if (minCMY === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
  }

  c = (c - minCMY) / (1 - minCMY);
  m = (m - minCMY) / (1 - minCMY);
  y = (y - minCMY) / (1 - minCMY);
  k = minCMY;

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100)
  };
};

export const cmykToRgb = (c: number, m: number, y: number, k: number): { r: number; g: number; b: number } => {
  const cVal = c / 100;
  const mVal = m / 100;
  const yVal = y / 100;
  const kVal = k / 100;

  const r = 255 * (1 - cVal) * (1 - kVal);
  const g = 255 * (1 - mVal) * (1 - kVal);
  const b = 255 * (1 - yVal) * (1 - kVal);

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b)
  };
};
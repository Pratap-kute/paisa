/**
 * Lightweight Color conversions and adjustments (CIE L*a*b* & sRGB)
 * Replaces external chroma-js dependency.
 */

const LAB_KN = 18;
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;
const DELTA = 6 / 29;

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

export function rgbToLab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / XN;
  const y = (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / YN;
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / ZN;

  const fx = x > Math.pow(DELTA, 3)
    ? Math.cbrt(x)
    : x / (3 * DELTA * DELTA) + 4 / 29;
  const fy = y > Math.pow(DELTA, 3)
    ? Math.cbrt(y)
    : y / (3 * DELTA * DELTA) + 4 / 29;
  const fz = z > Math.pow(DELTA, 3)
    ? Math.cbrt(z)
    : z / (3 * DELTA * DELTA) + 4 / 29;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return [l, a, bVal];
}

export function labToRgb(
  l: number,
  a: number,
  bVal: number,
): [number, number, number] {
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - bVal / 200;

  const x = (fx > DELTA ? Math.pow(fx, 3) : 3 * DELTA * DELTA * (fx - 4 / 29)) *
    XN;
  const y = (fy > DELTA ? Math.pow(fy, 3) : 3 * DELTA * DELTA * (fy - 4 / 29)) *
    YN;
  const z = (fz > DELTA ? Math.pow(fz, 3) : 3 * DELTA * DELTA * (fz - 4 / 29)) *
    ZN;

  const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" +
    [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function parseColorToRgb(color: string): [number, number, number] {
  const str = color.trim();
  if (str.startsWith("rgb")) {
    const match = str.match(
      /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i,
    );
    if (match) {
      return [
        Math.round(Number(match[1])),
        Math.round(Number(match[2])),
        Math.round(Number(match[3])),
      ];
    }
  }
  let cleaned = str.replace(/^#/, "");
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function hexToRgb(hex: string): [number, number, number] {
  return parseColorToRgb(hex);
}

export function desaturateRgb(
  r: number,
  g: number,
  b: number,
  amount: number = 1,
): [number, number, number] {
  const [l, a, bVal] = rgbToLab(r, g, b);
  let c = Math.sqrt(a * a + bVal * bVal);
  const h = Math.atan2(bVal, a);
  c = Math.max(0, c - LAB_KN * amount);
  const newA = Math.cos(h) * c;
  const newB = Math.sin(h) * c;
  return labToRgb(l, newA, newB);
}

export function darkenOrLighten(
  backgroundColor: string,
  intensity: number = 2,
): string {
  const [red, green, blue] = parseColorToRgb(backgroundColor);
  // http://www.w3.org/TR/AERT#color-contrast
  const brightness = (red * 299 + green * 587 + blue) / 1000;
  const [l, a, bVal] = rgbToLab(red, green, blue);
  const newL = brightness > 125
    ? l - LAB_KN * intensity
    : l + LAB_KN * intensity;
  const [r, g, b] = labToRgb(newL, a, bVal);
  return rgbToHex(r, g, b);
}

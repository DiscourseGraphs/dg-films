// Colors for the tween engine. Two colors mix in OKLab, so a blue-to-green
// verdict change passes through believable colors instead of the muddy gray
// that sRGB interpolation gives.

export type RGBA = [r: number, g: number, b: number, a: number];

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

export const parseColor = (text: string): RGBA | null => {
  const value = text.trim();
  if (value === "transparent") return [0, 0, 0, 0];
  const hex = HEX.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("");
    const channel = (index: number): number => parseInt(digits.slice(index * 2, index * 2 + 2), 16);
    return [channel(0), channel(1), channel(2), digits.length === 8 ? channel(3) / 255 : 1];
  }
  const func = FUNC.exec(value);
  if (func) {
    const alpha =
      func[4] === undefined ? 1 : func[4].endsWith("%") ? Number.parseFloat(func[4]) / 100 : Number(func[4]);
    return [Number(func[1]), Number(func[2]), Number(func[3]), alpha];
  }
  return null;
};

const toLinear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (value: number): number => {
  const c = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(c * 255)));
};

type Lab = [number, number, number];

const toOklab = ([r, g, b]: RGBA): Lab => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

const fromOklab = ([L, a, b]: Lab): [number, number, number] => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

export const mixColors = (from: RGBA, to: RGBA, p: number): RGBA => {
  // A fully transparent end has no hue of its own: borrow the other end's, so
  // fading in doesn't pass through black.
  const a = from[3] === 0 ? ([to[0], to[1], to[2], 0] as RGBA) : from;
  const b = to[3] === 0 ? ([from[0], from[1], from[2], 0] as RGBA) : to;
  const labA = toOklab(a);
  const labB = toOklab(b);
  const [r, g, bl] = fromOklab([
    labA[0] + (labB[0] - labA[0]) * p,
    labA[1] + (labB[1] - labA[1]) * p,
    labA[2] + (labB[2] - labA[2]) * p,
  ]);
  return [r, g, bl, a[3] + (b[3] - a[3]) * p];
};

export const formatColor = ([r, g, b, a]: RGBA): string =>
  a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${Math.round(a * 1000) / 1000})`;

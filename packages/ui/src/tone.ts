// Reading a colour: whether it is light, and which ink draws on it. Used by
// every component that puts marks on a shade.

export const isLight = (hex: string): boolean => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
};

const luminance = (hex: string): number => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
};

/** The ink a structure drawing uses on a shade: nude-deep on light, cocoa on mid, sand on dark tones. */
export const inkOn = (hex: string): string => {
  const light = luminance(hex);
  return light > 170 ? '#9F7A5C' : light > 120 ? '#6B4F3F' : '#E3D8C8';
};

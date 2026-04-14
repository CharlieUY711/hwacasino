// /lib/roulette/constants.ts

export const GOLD = '#D4AF37';
export const DARK = '#0A0A0A';
export const GREEN_FELT = '#0a3d24';

export const WHEEL_ORDER = [
  0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
];

export const RED_NUMBERS = new Set([
  1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
]);

export const CHIP_DEFS = [
  { value: 10,    label: '10',  color: '#1a0e00' },
  { value: 50,    label: '50',  color: '#7c1d1d' },
  { value: 100,   label: '100', color: '#1a3a6e' },
  { value: 250,   label: '250', color: '#2d4a1e' },
  { value: 500,   label: '500', color: '#4a1a6e' },
  { value: 1000,  label: '1K',  color: '#6e3a00' },
  { value: 10000, label: '10K', color: '#0d0d0d' },
];

export const TABLE_COLS: [number, number, number][] = Array.from(
  { length: 12 },
  (_, col) => [col * 3 + 3, col * 3 + 2, col * 3 + 1]
);

// /lib/roulette/utils.ts
import { RED_NUMBERS } from './constants';

export function getColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

export function fmtChipVal(amount: number): string {
  if (amount >= 10000) return `${Math.floor(amount / 10000)}0K`;
  if (amount >= 1000) return `${Math.floor(amount / 1000)}K`;
  return String(amount);
}

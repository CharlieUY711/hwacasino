// /lib/roulette/bets.ts
import { getColor } from './utils';

export function isWinningBet(bet, result) {
  const c = getColor(result);

  switch (bet.type) {
    case 'number':
      return parseInt(bet.value) === result;

    case 'color':
      return bet.value === c;

    case 'parity':
      return result !== 0 && (bet.value === 'even' ? result % 2 === 0 : result % 2 !== 0);

    case 'half':
      return result !== 0 && (bet.value === 'low' ? result <= 18 : result >= 19);

    case 'dozen': {
      const d = parseInt(bet.value);
      return result !== 0 && result >= (d - 1) * 12 + 1 && result <= d * 12;
    }

    case 'column': {
      const col = parseInt(bet.value);
      return result !== 0 && result % 3 === (col === 3 ? 0 : col === 2 ? 2 : 1);
    }

    case 'split2':
    case 'split4':
    case 'street3':
    case 'sixline6': {
      const nums = bet.value.split('-').map(Number);
      return nums.includes(result);
    }

    default:
      return false;
  }
}

export function calcLocalPayout(bets, winNum) {
  let total = 0;

  for (const bet of bets) {
    if (!isWinningBet(bet, winNum)) continue;

    switch (bet.type) {
      case 'number':
        total += bet.amount * 35;
        break;

      case 'split2':
        total += bet.amount * 17;
        break;

      case 'split4':
        total += bet.amount * 8;
        break;

      case 'street3':
        total += bet.amount * 11;
        break;

      case 'sixline6':
        total += bet.amount * 5;
        break;

      case 'dozen':
      case 'column':
        total += bet.amount * 3;
        break;

      default:
        total += bet.amount * 2;
        break;
    }
  }

  return { total, won: total > 0 };
}

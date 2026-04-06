import crypto from 'crypto';

export function spinRoulette() {
  const seed = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');

  const number = parseInt(hash.substring(0, 8), 16) % 37;

  return {
    seed,
    hash,
    result: number
  };
}

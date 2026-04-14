// /components/roulette/NumberGrid.tsx
'use client';

import React from 'react';
import { GOLD } from '@/lib/roulette/constants';

export default function NumberGrid({
  TABLE_COLS,
  getBetOn,
  addBet,
  resultNumber,
  showResult,
  bets,
  lastBets,
  locked
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TABLE_COLS.length}, 1fr)`, gap: '2px' }}>
      {TABLE_COLS.map((col, colIndex) => (
        <div key={colIndex} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {col.map((num) => {
            const id = `number:${num}`;
            const hasBet = getBetOn(id) > 0;

            const isWin =
              resultNumber !== null &&
              !showResult &&
              hasBet &&
              resultNumber === num;

            return (
              <div
                key={num}
                data-number-cell
                data-number={num}
                onClick={(e) => addBet('number', String(num), e)}
                className={`bet-cell${locked ? ' locked' : ''}${isWin ? ' win-cell' : ''}`}
                style={{
                  width: 32,
                  height: 32,
                  background: hasBet ? 'rgba(15,92,30,0.8)' : 'rgba(15,92,30,0.4)',
                  border: `1px solid ${isWin ? GOLD : 'rgba(212,175,55,0.3)'}`,
                  boxShadow: isWin ? `0 0 10px rgba(212,175,55,0.5)` : 'none',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: num === 0 ? '#4ade80' : '#fff',
                  userSelect: 'none',
                  cursor: locked ? 'default' : 'pointer'
                }}
              >
                {num}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

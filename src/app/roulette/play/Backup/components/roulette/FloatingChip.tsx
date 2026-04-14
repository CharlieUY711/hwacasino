// /components/roulette/FloatingChip.tsx
import { CHIP_DEFS, GOLD, CHIP_BG, CHIP_BORDER } from '@/lib/roulette/constants';
import { fmtChipVal } from '@/lib/roulette/utils';

export default function FloatingChip({ bet, winning }) {
  const chip = CHIP_DEFS.slice().reverse().find(c => bet.amount >= c.value) ?? CHIP_DEFS[0];
  const size = 16;

  return (
    <div
      style={{
        position: 'absolute',
        left: bet.chipX - size / 2,
        top: bet.chipY - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        background: winning ? '#fff' : CHIP_BG,
        border: `1.5px solid ${winning ? GOLD : CHIP_BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        boxShadow: winning
          ? `0 0 10px ${GOLD}, 0 0 20px rgba(212,175,55,0.5)`
          : '0 2px 6px rgba(0,0,0,0.7)',
        pointerEvents: 'none',
        zIndex: 20,
        transition: 'background 0.3s, box-shadow 0.3s',
      }}
    >
      <span
        style={{
          fontSize: 5,
          fontWeight: 900,
          color: winning ? GOLD : chip.color,
          lineHeight: 1,
        }}
      >
        {fmtChipVal(bet.amount)}
      </span>
    </div>
  );
}

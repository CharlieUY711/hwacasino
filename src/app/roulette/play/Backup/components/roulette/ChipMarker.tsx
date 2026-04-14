// /components/roulette/ChipMarker.tsx
import { CHIP_DEFS, GOLD, CHIP_BG, CHIP_BORDER } from '@/lib/roulette/constants';
import { fmtChipVal } from '@/lib/roulette/utils';

export default function ChipMarker({ amount, size = 18, winning = false }) {
  const chip = CHIP_DEFS.slice().reverse().find(c => amount >= c.value) ?? CHIP_DEFS[0];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: winning ? '#fff' : CHIP_BG,
        border: `1.5px solid ${winning ? GOLD : CHIP_BORDER}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: winning
          ? `0 0 8px ${GOLD}`
          : '0 2px 6px rgba(0,0,0,0.6)',
        transition: 'all 0.3s ease',
      }}
    >
      <span
        style={{
          fontSize: size * 0.28,
          fontWeight: 900,
          color: winning ? GOLD : chip.color,
          lineHeight: 1,
        }}
      >
        {fmtChipVal(amount)}
      </span>
    </div>
  );
}
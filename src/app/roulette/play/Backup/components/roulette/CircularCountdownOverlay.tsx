// /components/roulette/CircularCountdownOverlay.tsx
'use client';

export function CircularCountdownOverlay({ seconds, status, t }) {
  const TOTAL = 40; // duración total de la ronda
  const progress = seconds / TOTAL;

  const color = '#D4AF37'; // dorado VIP
  const radius = 110;
  const circumference = 2 * Math.PI * radius;

  const strokeOffset = (1 - progress) * circumference;

  const show =
    status === 'betting' ||
    (status === 'closed' && seconds === 0); // mostrar "apuestas cerradas"

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: show ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'flex-start',
        pointerEvents: 'none',
        borderRadius: '50%',
        background:
          status === 'betting'
            ? 'rgba(255,0,0,0.15)'
            : 'rgba(255,0,0,0.25)',
        transition: 'opacity 0.4s ease',
      }}
    >
      <svg width="240" height="240" style={{ position: 'absolute' }}>
        <circle
          cx="120"
          cy="120"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{
            transition: 'stroke-dashoffset 1s linear',
            opacity: status === 'betting' ? 1 : 0.6,
          }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          fontSize: status === 'betting' ? '48px' : '22px',
          fontWeight: 700,
          color,
          textShadow: '0 0 10px rgba(0,0,0,0.6)',
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}
      >
        {status === 'betting'
          ? seconds
          : t('bets_closed')}
      </div>
    </div>
  );
}

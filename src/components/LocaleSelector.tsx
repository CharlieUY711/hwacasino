'use client'
import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Locale } from '@/lib/i18n'

const GOLD = '#D4AF37'

export function LocaleSelector() {
  const { locale, setLocale, flag, name, flags, names, availableLocales } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onPointerDown={() => setOpen(p => !p)}
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', touchAction: 'manipulation' }}>
        <span>{flag}</span>
        <span style={{ color: GOLD, fontWeight: 600 }}>{name}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.5rem' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#1a1a1a', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '6px', overflow: 'hidden', zIndex: 999, minWidth: '100px' }}>
          {availableLocales.map(l => (
            <button key={l} onPointerDown={() => { setLocale(l as Locale); setOpen(false) }}
              style={{ width: '100%', background: l === locale ? 'rgba(212,175,55,0.1)' : 'transparent', border: 'none', padding: '8px 12px', color: l === locale ? GOLD : 'rgba(255,255,255,0.7)', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', touchAction: 'manipulation' }}>
              <span>{flags[l as Locale]}</span>
              <span>{names[l as Locale]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'

export type PromoStatus = 'idle' | 'loading' | 'valid' | 'invalid'

export interface PromoData {
  code:                 string
  reward_chips:         number
  bonus_active:         boolean
  purchase_bonus_type:  'percent' | 'free_chips' | null
  purchase_bonus_value: number | null
  purchase_bonus_label: string | null
}

export function usePromoCode(userId: string | null) {
  const [code,   setCode]   = useState('')
  const [status, setStatus] = useState<PromoStatus>('idle')
  const [promo,  setPromo]  = useState<PromoData | null>(null)
  const [reason, setReason] = useState('')

  async function validate() {
    const trimmed = code.trim()
    if (!trimmed || !userId) return
    setStatus('loading')
    setReason('')
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, user_id: userId }),
      })
      const data = await res.json()
      if (data.valid) {
        setStatus('valid')
        setPromo(data)
      } else {
        setStatus('invalid')
        setReason(data.reason ?? 'invalid')
        setPromo(null)
      }
    } catch {
      setStatus('invalid')
      setReason('error')
    }
  }

  async function apply(stage = 'registration'): Promise<PromoData | null> {
    const trimmed = code.trim()
    if (!trimmed || !userId) return null
    const res = await fetch('/api/promo/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed, user_id: userId, stage }),
    })
    const data = await res.json()
    if (data.applied) return data
    return null
  }

  function getChipsWithBonus(baseChips: number): number {
    if (!promo || status !== 'valid') return baseChips
    if (promo.purchase_bonus_type === 'percent' && promo.purchase_bonus_value) {
      return baseChips + Math.floor(baseChips * promo.purchase_bonus_value / 100)
    }
    if (promo.purchase_bonus_type === 'free_chips' && promo.purchase_bonus_value) {
      return baseChips + promo.purchase_bonus_value
    }
    return baseChips
  }

  const REASONS: Record<string, string> = {
    not_found:    'Código inválido o no existe.',
    expired:      'Este código ya expiró.',
    exhausted:    'Este código ya alcanzó su límite de usos.',
    already_used: 'Ya usaste este código.',
    error:        'Error de conexión. Intentá de nuevo.',
  }

  return {
    code, setCode,
    status, promo, reason,
    reasonLabel: REASONS[reason] ?? 'Código inválido.',
    validate, apply, getChipsWithBonus,
    reset: () => { setCode(''); setStatus('idle'); setPromo(null); setReason('') },
  }
}

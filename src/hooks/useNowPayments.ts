import { useState, useRef, useCallback } from 'react'

export type NowPaymentStatus =
  | 'idle'
  | 'creating'
  | 'waiting'       // Esperando que el usuario envíe
  | 'confirming'    // Red confirmando
  | 'finished'      // Acreditado
  | 'failed'
  | 'expired'
  | 'confirmed'
  | 'error'

export interface NowPaymentInvoice {
  payment_id:    string
  pay_address:   string
  pay_amount:    number
  pay_currency:  string
  estimated_usd: number
  expires_at:    string
}

export function useNowPayments(userId: string | null) {
  const [status, setStatus]   = useState<NowPaymentStatus>('idle')
  const [invoice, setInvoice] = useState<NowPaymentInvoice | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const pollRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const createPayment = useCallback(async (amountUsd: number, currency = 'usdttrc20') => {
    if (!userId) return
    setStatus('creating')
    setError(null)
    setInvoice(null)
    stopPolling()

    try {
      const res = await fetch('/api/payments/nowpayments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount_usd: amountUsd, currency }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setError(data.error ?? 'Error creando pago')
        return
      }

      setInvoice(data)
      setStatus('waiting')

      // Polling cada 10 segundos
      pollRef.current = setInterval(async () => {
        try {
          const sRes = await fetch(`/api/payments/nowpayments/status?payment_id=${data.payment_id}`)
          const sData = await sRes.json()
          const s: NowPaymentStatus = sData.status as NowPaymentStatus

          if (s === 'finished' || s === 'confirmed') {
            setStatus('finished')
            stopPolling()
          } else if (s === 'failed' || s === 'expired') {
            setStatus(s)
            stopPolling()
          } else if (s === 'confirming') {
            setStatus('confirming')
          }
        } catch { /* ignorar errores de red en polling */ }
      }, 10_000)

    } catch (err) {
      console.error('[useNowPayments]', err)
      setStatus('error')
      setError('Error de conexión')
    }
  }, [userId, stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    setStatus('idle')
    setInvoice(null)
    setError(null)
  }, [stopPolling])

  return { status, invoice, error, createPayment, reset }
}


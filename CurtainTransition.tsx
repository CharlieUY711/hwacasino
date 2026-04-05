'use client'

import { useEffect, useState } from 'react'

interface CurtainTransitionProps {
  trigger: boolean        // ponelo en true cuando querés abrir el telón
  onComplete?: () => void // callback cuando termina la animación
  children?: React.ReactNode
}

export default function CurtainTransition({ trigger, onComplete, children }: CurtainTransitionProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!trigger) return
    // pequeño delay para que el usuario vea el estado final del form antes de abrir
    const t1 = setTimeout(() => setOpen(true), 120)
    const t2 = setTimeout(() => onComplete?.(), 900) // cuando termina CSS (700ms) + buffer
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [trigger])

  return (
    <>
      {children}

      {/* Panel izquierdo */}
      <div style={{
        position: 'fixed', inset: 0,
        width: open ? '0%' : '50%',
        left: 0,
        background: '#000',
        zIndex: 9999,
        transition: open ? 'width 0.7s cubic-bezier(0.76, 0, 0.24, 1)' : 'none',
        transformOrigin: 'left center',
      }} />

      {/* Panel derecho */}
      <div style={{
        position: 'fixed', inset: 0,
        width: open ? '0%' : '50%',
        right: 0, left: 'auto',
        background: '#000',
        zIndex: 9999,
        transition: open ? 'width 0.7s cubic-bezier(0.76, 0, 0.24, 1)' : 'none',
        transformOrigin: 'right center',
      }} />
    </>
  )
}

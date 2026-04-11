'use client'
import { useEffect, useRef, useState } from 'react'

const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]

export default function EsmeraldaRoulette() {

  const canvasRef = useRef(null)
  const [deg, setDeg] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winning, setWinning] = useState(null)

  useEffect(() => {
    drawWheel()
  }, [])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const size = 600
    canvas.width = size
    canvas.height = size

    const center = size / 2
    const radius = center - 5
    const slice = (2 * Math.PI) / numbers.length

    numbers.forEach((num, i) => {
      const angle = i * slice

      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.arc(center, center, radius, angle, angle + slice)
      ctx.closePath()

      if (num === 0) ctx.fillStyle = '#085230'
      else if ([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num)) ctx.fillStyle = '#930010'
      else ctx.fillStyle = '#000'

      ctx.fill()
      ctx.strokeStyle = '#d4af37'
      ctx.stroke()

      ctx.save()
      ctx.translate(center, center)
      ctx.rotate(angle + slice / 2)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 18px sans-serif'
      ctx.rotate(Math.PI / 2)
      ctx.fillText(num.toString(), 0, -radius + 30)
      ctx.restore()
    })
  }

  const spin = async () => {
    if (spinning) return
    setSpinning(true)

    // 🔥 LLAMADA A TU MOTOR REAL
    const res = await fetch('process.env.NEXT_PUBLIC_API_URL/spin')
    const data = await res.json()

    const win = data.number
    setWinning(win)

    const index = numbers.indexOf(win)
    const slice = 360 / numbers.length

    const extra = 5
    const target = extra * 360 + (360 - index * slice) - 90

    setDeg(prev => prev + target)

    setTimeout(() => {
      setSpinning(false)
    }, 6000)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">

      <div className="relative w-[320px] h-[320px]">
        <canvas
          ref={canvasRef}
          style={{ transform: `rotate(${deg}deg)` }}

          className="w-full h-full rounded-full transition-transform duration-[6000ms]"
        />

        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          ▲
        </div>
      </div>

      <button
        onClick={spin}
        className="mt-6 px-6 py-3 bg-yellow-500 text-black font-bold"
      >
        GIRAR
      </button>

      <div className="mt-4 text-xl">
        {winning !== null ? "Resultado: " + winning : '—'}
      </div>

    </div>
  )
}


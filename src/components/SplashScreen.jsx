import { useEffect, useRef } from 'react'

export default function SplashScreen() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    function resize() {
      canvas.width = window.innerWidth * 2
      canvas.height = window.innerHeight * 2
    }
    resize()

    const particles = []
    const count = 35
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.8,
        dy: (Math.random() - 0.5) * 0.8,
        isViolet: Math.random() > 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      })
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.dx
        p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2)
        ctx.fillStyle = p.isViolet
          ? `rgba(139,92,246,${p.alpha})`
          : `rgba(236,72,153,${p.alpha})`
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 200) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / 200)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0f0a1e' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10 text-center">
        <svg
          viewBox="0 0 100 100"
          className="w-[72px] h-[72px] mx-auto"
          style={{ filter: 'drop-shadow(0 0 30px rgba(139,92,246,0.5))' }}
        >
          <defs>
            <linearGradient id="splash-g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#8b5cf6' }} />
              <stop offset="100%" style={{ stopColor: '#ec4899' }} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="22" fill="url(#splash-g)" />
          <text x="44" y="70" textAnchor="middle" fontFamily="-apple-system, sans-serif" fontSize="58" fontWeight="700" fill="white">С</text>
          <path d="M72 30 C68 25, 62 22, 62 17 C62 13, 65 11, 68 11 C70 11, 72 13, 73 15 C74 13, 76 11, 78 11 C81 11, 84 13, 84 17 C84 22, 78 25, 73 30Z" fill="white" opacity="0.8" />
        </svg>
        <p className="text-white text-2xl font-bold mt-4">Свои</p>
        <p className="text-white/40 text-sm mt-1">Мессенджер для своих</p>
      </div>
    </div>
  )
}

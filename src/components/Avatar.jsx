import { useRef, useEffect } from 'react'

const PALETTES = [
  { from: '#8b5cf6', to: '#ec4899' },
  { from: '#6366f1', to: '#8b5cf6' },
  { from: '#ec4899', to: '#f43f5e' },
  { from: '#a855f7', to: '#6366f1' },
  { from: '#f472b6', to: '#a855f7' },
  { from: '#7c3aed', to: '#ec4899' },
  { from: '#818cf8', to: '#c084fc' },
  { from: '#e879f9', to: '#fb7185' },
]

const SIZES = {
  xs: 16,
  sm: 24,
  md: 36,
  lg: 40,
  xl: 64,
  xxl: 80,
}

function hash(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h)
  }
  return Math.abs(h)
}

function drawFace(canvas, username, pixelSize) {
  const ctx = canvas.getContext('2d')
  const size = pixelSize * 2 // retina
  canvas.width = size
  canvas.height = size
  canvas.style.width = pixelSize + 'px'
  canvas.style.height = pixelSize + 'px'

  const h = hash(username)
  const pal = PALETTES[h % PALETTES.length]

  // Background gradient
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, pal.from)
  g.addColorStop(1, pal.to)
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()

  const cx = size / 2
  const faceY = size * 0.44

  // Eyes
  const eyeSpread = size * 0.12 + (h % 5) * (size * 0.005)
  const eyeY = faceY - size * 0.02
  const eyeStyle = h % 4

  ctx.fillStyle = 'white'
  ctx.strokeStyle = 'white'
  ctx.lineCap = 'round'

  if (eyeStyle === 0) {
    // Round eyes
    const r = size * 0.04
    ctx.beginPath(); ctx.arc(cx - eyeSpread, eyeY, r, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + eyeSpread, eyeY, r, 0, Math.PI * 2); ctx.fill()
  } else if (eyeStyle === 1) {
    // Line eyes (happy)
    ctx.lineWidth = size * 0.025
    ctx.beginPath()
    ctx.arc(cx - eyeSpread, eyeY, size * 0.035, Math.PI, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + eyeSpread, eyeY, size * 0.035, Math.PI, 2 * Math.PI)
    ctx.stroke()
  } else if (eyeStyle === 2) {
    // Dot eyes
    const r = size * 0.025
    ctx.beginPath(); ctx.arc(cx - eyeSpread, eyeY, r, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(cx + eyeSpread, eyeY, r, 0, Math.PI * 2); ctx.fill()
  } else {
    // Oval eyes
    ctx.beginPath()
    ctx.ellipse(cx - eyeSpread, eyeY, size * 0.035, size * 0.045, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + eyeSpread, eyeY, size * 0.035, size * 0.045, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Mouth
  ctx.strokeStyle = 'white'
  ctx.lineWidth = size * 0.02
  ctx.lineCap = 'round'
  const mouthY = faceY + size * 0.13
  const mouthW = size * 0.08 + (h % 4) * (size * 0.015)
  const mouthStyle = (h >> 4) % 4

  if (mouthStyle === 0) {
    // Smile arc
    ctx.beginPath()
    ctx.arc(cx, mouthY - size * 0.03, mouthW, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
  } else if (mouthStyle === 1) {
    // Wide smile
    ctx.beginPath()
    ctx.arc(cx, mouthY - size * 0.04, mouthW * 1.2, 0.1 * Math.PI, 0.9 * Math.PI)
    ctx.stroke()
  } else if (mouthStyle === 2) {
    // Small line
    ctx.beginPath()
    ctx.moveTo(cx - mouthW * 0.5, mouthY)
    ctx.lineTo(cx + mouthW * 0.5, mouthY)
    ctx.stroke()
  } else {
    // Small o
    ctx.lineWidth = size * 0.015
    ctx.beginPath()
    ctx.arc(cx, mouthY, size * 0.03, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Blush / cheeks
  if (h % 3 !== 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.13)'
    const cheekR = size * 0.05
    ctx.beginPath()
    ctx.arc(cx - eyeSpread - size * 0.03, faceY + size * 0.06, cheekR, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + eyeSpread + size * 0.03, faceY + size * 0.06, cheekR, 0, Math.PI * 2)
    ctx.fill()
  }

  // Optional: eyebrows
  if ((h >> 8) % 3 === 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = size * 0.015
    const browY = eyeY - size * 0.06
    ctx.beginPath()
    ctx.moveTo(cx - eyeSpread - size * 0.03, browY + size * 0.01)
    ctx.lineTo(cx - eyeSpread + size * 0.03, browY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + eyeSpread - size * 0.03, browY)
    ctx.lineTo(cx + eyeSpread + size * 0.03, browY + size * 0.01)
    ctx.stroke()
  }
}

export default function Avatar({ username, size = 'md', isGroup = false, groupName, className = '' }) {
  const canvasRef = useRef(null)
  const pixelSize = SIZES[size] || SIZES.md

  useEffect(() => {
    if (canvasRef.current && !isGroup) {
      drawFace(canvasRef.current, username, pixelSize)
    }
  }, [username, pixelSize, isGroup])

  if (isGroup) {
    return (
      <div
        className={`bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
        style={{ width: pixelSize, height: pixelSize, fontSize: pixelSize * 0.38, borderRadius: '25%' }}
      >
        {(groupName || '?')[0].toUpperCase()}
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  )
}

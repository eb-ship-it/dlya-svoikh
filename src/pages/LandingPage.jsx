import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MayachokIcon from '../components/MayachokIcon'

function ParticlesCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    let animId

    function resize() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = []
    for (let i = 0; i < 35; i++) {
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
        p.x += p.dx; p.y += p.dy
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2)
        ctx.fillStyle = p.isViolet ? `rgba(139,92,246,${p.alpha})` : `rgba(236,72,153,${p.alpha})`
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 200 * dpr
          if (dist < maxDist) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - dist / maxDist)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(animate)
    }
    animate()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 z-0 pointer-events-none" />
}

export default function LandingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const prevBody = { height: document.body.style.height, overflow: document.body.style.overflow }
    const prevRoot = document.getElementById('root')
    const prevRootHeight = prevRoot?.style.height
    const prevRootOverflow = prevRoot?.style.overflow
    document.body.style.height = 'auto'
    document.body.style.overflow = 'auto'
    if (prevRoot) {
      prevRoot.style.height = 'auto'
      prevRoot.style.overflow = 'visible'
    }
    return () => {
      document.body.style.height = prevBody.height
      document.body.style.overflow = prevBody.overflow
      if (prevRoot) {
        prevRoot.style.height = prevRootHeight || ''
        prevRoot.style.overflow = prevRootOverflow || ''
      }
    }
  }, [])

  return (
    <div style={{ background: '#0f0a1e', minHeight: '100vh', color: 'white', overflowX: 'hidden' }}>
      <ParticlesCanvas />

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 py-10">
        <img
          src="/icon.svg" alt="Свои"
          className="w-24 h-24 rounded-3xl mb-7"
          style={{ boxShadow: '0 0 80px rgba(139,92,246,0.5), 0 0 160px rgba(236,72,153,0.2)', animation: 'float 4s ease-in-out infinite' }}
        />
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4" style={{ background: 'linear-gradient(135deg, #fff, #e0d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Свои
        </h1>
        <p className="text-white/50 text-lg leading-relaxed max-w-md mb-9">
          Мессенджер для близких друзей. Никакой рекламы, алгоритмов и лишних людей.
        </p>
        <button
          onClick={() => navigate('/auth?tab=register')}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold px-9 py-4 rounded-full text-base transition-transform hover:scale-105"
          style={{ boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
        >
          Начать общение
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </button>
        <div className="mt-14 text-white/20 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7" /></svg>
        </div>
      </section>

      {/* Glow divider */}
      <div className="h-px max-w-lg mx-auto" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.3), transparent)' }} />

      {/* Features */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-28">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">Всё для общения</h2>
        <p className="text-center text-white/40 mb-14">Простой и уютный мессенджер, где нет ничего лишнего</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: 'Чаты',
              desc: 'Личные и групповые с ответами на сообщения и мгновенной доставкой',
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
            },
            {
              title: 'Лента',
              desc: 'Делись мыслями, реагируй эмодзи и комментируй посты друзей',
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="white" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              ),
            },
            {
              title: 'Маячок',
              desc: 'AI-советник пишет тебе каждый день что-то полезное',
              icon: <MayachokIcon size={28} />,
            },
          ].map(f => (
            <div
              key={f.title}
              className="text-center p-8 rounded-3xl border border-white/[0.06] transition-all hover:-translate-y-1.5"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.2))', border: '1px solid rgba(139,92,246,0.2)' }}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Glow divider */}
      <div className="h-px max-w-lg mx-auto" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.3), transparent)' }} />

      {/* Phone mockup */}
      <section className="relative z-10 py-16 text-center px-6">
        <div
          className="w-64 mx-auto rounded-[32px] overflow-hidden"
          style={{ border: '3px solid rgba(255,255,255,0.1)', background: '#1a1028', boxShadow: '0 0 80px rgba(139,92,246,0.15), 0 20px 60px rgba(0,0,0,0.5)' }}
        >
          <div className="bg-gradient-to-r from-violet-500 to-pink-500 px-4 py-3">
            <span className="text-white text-sm font-semibold">Аня Смирнова</span>
          </div>
          <div className="bg-gray-50 p-3 space-y-2">
            {[
              { r: false, t: 'Привет! Как дела?' },
              { r: true, t: 'Отлично! Гуляем сегодня?' },
              { r: false, t: 'Давай в 6 в парке! 🌳' },
              { r: true, t: 'Супер, буду! 💜' },
              { r: false, t: 'Жду! :)' },
            ].map((m, i) => (
              <div key={i} className={`flex ${m.r ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-1.5 text-xs max-w-[75%] ${m.r ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-2xl rounded-br-sm' : 'bg-white text-gray-700 rounded-2xl rounded-bl-sm shadow-sm'}`}>
                  {m.t}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Glow divider */}
      <div className="h-px max-w-lg mx-auto" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), rgba(236,72,153,0.3), transparent)' }} />

      {/* Steps */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">Как начать</h2>
          {[
            { n: '1', title: 'Регистрация', desc: 'Только логин и пароль — за 30 секунд' },
            { n: '2', title: 'Пригласи друзей', desc: 'Отправь персональную ссылку — друг добавится автоматически' },
            { n: '3', title: 'Общайся', desc: 'Чаты, лента, реакции — всё для приятного общения' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-start gap-5 mb-8 relative pl-1">
              {i < 2 && <div className="absolute left-[22px] top-12 bottom-[-32px] w-0.5" style={{ background: 'linear-gradient(to bottom, rgba(139,92,246,0.3), transparent)' }} />}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}
              >
                {s.n}
              </div>
              <div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 pb-24 text-center">
        <div
          className="max-w-lg mx-auto rounded-[32px] px-8 py-12"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.15))', border: '1px solid rgba(139,92,246,0.2)', backdropFilter: 'blur(20px)' }}
        >
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">Присоединяйся</h2>
          <p className="text-white/50 mb-7">Создай аккаунт и пригласи тех, с кем хочешь быть на связи</p>
          <button
            onClick={() => navigate('/auth?tab=register')}
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold px-9 py-4 rounded-full text-base"
            style={{ boxShadow: '0 0 40px rgba(139,92,246,0.3)' }}
          >
            Создать аккаунт
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-white/20 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Свои — мессенджер для своих
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  )
}

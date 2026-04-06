import { useNavigate } from 'react-router-dom'

function PhoneMockup({ title, headerExtra, children }) {
  return (
    <div className="mt-5 mx-auto w-56 rounded-2xl border-4 border-gray-800 bg-gray-100 overflow-hidden shadow-lg" style={{ height: 380 }}>
      <div className="bg-gradient-to-r from-violet-500 to-pink-500 px-3 py-2 flex items-center gap-2">
        {headerExtra}
        <span className="text-white text-xs font-semibold">{title}</span>
      </div>
      {children}
    </div>
  )
}

function FeatureCard({ title, desc, children }) {
  return (
    <div className="group bg-gray-50 hover:bg-gradient-to-br hover:from-violet-50 hover:to-pink-50 rounded-2xl p-6 transition-all">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      {children}
    </div>
  )
}

function MayachokSvg({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8b5cf6' }} />
          <stop offset="100%" style={{ stopColor: '#ec4899' }} />
        </linearGradient>
      </defs>
      <path d="M50 8 L58 18 L55 18 L60 85 L40 85 L45 18 L42 18 Z" fill="url(#mg)" />
      <rect x="35" y="85" width="30" height="8" rx="2" fill="url(#mg)" />
      <circle cx="50" cy="12" r="8" fill="none" stroke="url(#mg)" strokeWidth="3" opacity="0.4" />
    </svg>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-pink-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-32 text-center">
          <img src="/icon.svg" alt="Свои" className="w-24 h-24 md:w-28 md:h-28 rounded-3xl mx-auto mb-6 shadow-2xl shadow-black/20" />
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">Свои</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-md mx-auto mb-10 leading-relaxed">
            Мессенджер для близких друзей. Никакой рекламы, алгоритмов и лишних людей — только свои.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 bg-white text-violet-600 font-semibold px-8 py-3.5 rounded-2xl shadow-lg shadow-black/10 hover:shadow-xl hover:scale-105 transition-all text-base"
          >
            Начать общение
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-4">Всё для общения</h2>
        <p className="text-gray-400 text-center mb-12 max-w-lg mx-auto">
          Простой и уютный мессенджер, где нет ничего лишнего
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

          {/* Чаты */}
          <FeatureCard title="Чаты" desc="Личные и групповые чаты с мгновенной доставкой сообщений">
            <PhoneMockup
              title="Аня"
              headerExtra={
                <>
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><span className="text-white text-xs font-bold">А</span></div>
                </>
              }
            >
              <div className="px-3 py-3 space-y-2 bg-white">
                <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs text-gray-700 max-w-[75%]">Привет! Как дела?</div></div>
                <div className="flex justify-end"><div className="bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl rounded-tr-sm px-3 py-1.5 text-xs text-white max-w-[75%]">Отлично! Гуляем сегодня?</div></div>
                <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs text-gray-700 max-w-[75%]">Давай в 6 в парке!</div></div>
                <div className="flex justify-end"><div className="bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl rounded-tr-sm px-3 py-1.5 text-xs text-white max-w-[75%]">Супер, буду!</div></div>
                <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs text-gray-700 max-w-[75%]">Жду! :)</div></div>
              </div>
            </PhoneMockup>
          </FeatureCard>

          {/* Лента */}
          <FeatureCard title="Лента" desc="Делись мыслями и моментами с друзьями, реагируй и комментируй">
            <PhoneMockup title="Лента">
              <div className="px-3 py-3 space-y-3 bg-gray-100">
                <div className="bg-white rounded-xl p-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center"><span className="text-white text-[8px] font-bold">М</span></div>
                    <span className="text-[10px] font-semibold text-gray-800">Максим</span>
                    <span className="text-[9px] text-gray-400 ml-auto">2ч</span>
                  </div>
                  <p className="text-[10px] text-gray-700 leading-snug mb-1.5">Закончил проект! Полгода работы наконец-то дали результат</p>
                  <div className="flex gap-2 text-[10px] text-gray-400"><span>❤️ 5</span><span>🔥 3</span></div>
                </div>
                <div className="bg-white rounded-xl p-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center"><span className="text-white text-[8px] font-bold">К</span></div>
                    <span className="text-[10px] font-semibold text-gray-800">Катя</span>
                    <span className="text-[9px] text-gray-400 ml-auto">5ч</span>
                  </div>
                  <p className="text-[10px] text-gray-700 leading-snug mb-1.5">Утренний кофе и книга — идеальное начало выходных</p>
                  <div className="flex gap-2 text-[10px] text-gray-400"><span>❤️ 8</span><span>💬 2</span></div>
                </div>
                <div className="bg-white rounded-xl p-2.5 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center"><span className="text-white text-[8px] font-bold">Д</span></div>
                    <span className="text-[10px] font-semibold text-gray-800">Дима</span>
                    <span className="text-[9px] text-gray-400 ml-auto">1д</span>
                  </div>
                  <p className="text-[10px] text-gray-700 leading-snug">Кто завтра на волейбол?</p>
                </div>
              </div>
            </PhoneMockup>
          </FeatureCard>

          {/* Друзья */}
          <FeatureCard title="Друзья" desc="Добавляй друзей по логину или приглашай по ссылке">
            <PhoneMockup title="Друзья">
              <div className="bg-white">
                <div className="px-3 pt-3 pb-2">
                  <div className="bg-gray-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span className="text-[10px] text-gray-400">Найти по логину...</span>
                  </div>
                </div>
                <div className="mx-3 mb-2 bg-gradient-to-r from-violet-50 to-pink-50 rounded-lg px-2.5 py-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <span className="text-[10px] text-violet-600 font-medium">Пригласить по ссылке</span>
                </div>
                {[
                  { name: 'Аня Смирнова', login: '@anya', letter: 'А', from: 'from-emerald-400', to: 'to-cyan-500' },
                  { name: 'Максим Петров', login: '@max_p', letter: 'М', from: 'from-orange-400', to: 'to-rose-500' },
                  { name: 'Катя Иванова', login: '@katya_i', letter: 'К', from: 'from-amber-400', to: 'to-orange-500' },
                  { name: 'Дима Козлов', login: '@dimko', letter: 'Д', from: 'from-violet-400', to: 'to-pink-500' },
                ].map((f, i) => (
                  <div key={f.login} className={`flex items-center gap-2 px-3 py-2 ${i < 3 ? 'border-b border-gray-50' : ''}`}>
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${f.from} ${f.to} flex items-center justify-center`}><span className="text-white text-[9px] font-bold">{f.letter}</span></div>
                    <div><p className="text-[11px] font-medium text-gray-800">{f.name}</p><p className="text-[9px] text-gray-400">{f.login}</p></div>
                  </div>
                ))}
              </div>
            </PhoneMockup>
          </FeatureCard>

          {/* Маячок */}
          <FeatureCard title="Маячок" desc="Ежедневные советы и мотивация на основе твоих целей">
            <PhoneMockup title="Лента">
              <div className="px-3 py-3 bg-gray-100 space-y-3">
                <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-3 border border-violet-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MayachokSvg className="w-4 h-4" />
                    <span className="text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">Маячок</span>
                    <span className="text-[8px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full ml-auto">совет</span>
                  </div>
                  <p className="text-[10px] text-gray-700 leading-snug mb-2">Начни утро с 10 минут планирования — это сэкономит час в течение дня</p>
                  <div className="flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-white rounded-full text-gray-500 border border-gray-200">👍</span>
                    <span className="text-[10px] px-2 py-0.5 bg-white rounded-full text-gray-500 border border-gray-200">👎</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-800 mb-2">Твои цели:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-violet-500" /><span className="text-[10px] text-gray-600">Больше читать</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-pink-500" /><span className="text-[10px] text-gray-600">Учить английский</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /><span className="text-[10px] text-gray-600">Заниматься спортом</span></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-3 border border-violet-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MayachokSvg className="w-4 h-4" />
                    <span className="text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent">Маячок</span>
                    <span className="text-[8px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full ml-auto">мотивация</span>
                  </div>
                  <p className="text-[10px] text-gray-700 leading-snug">Маленькие шаги каждый день лучше, чем большой рывок раз в месяц</p>
                </div>
              </div>
            </PhoneMockup>
          </FeatureCard>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 text-center mb-12">Как начать</h2>
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-12">
            {[
              { num: '1', text: 'Зарегистрируйся за 30 секунд' },
              { num: '2', text: 'Пригласи друзей по ссылке' },
              { num: '3', text: 'Общайся, делись и вдохновляйся' },
            ].map((s, i) => (
              <div key={s.num} className="flex flex-col items-center text-center max-w-[200px]">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-pink-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold mb-4 shadow-lg shadow-violet-200">
                  {s.num}
                </div>
                <p className="text-gray-700 text-sm font-medium">{s.text}</p>
                {i < 2 && (
                  <svg className="w-6 h-6 text-gray-300 mt-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="bg-gradient-to-br from-violet-500 to-pink-500 rounded-3xl px-8 py-12 md:py-16 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Присоединяйся</h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Создай аккаунт и пригласи тех, с кем хочешь быть на связи
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 bg-white text-violet-600 font-semibold px-8 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base"
          >
            Создать аккаунт
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="Свои" className="w-6 h-6 rounded-lg" />
            <span className="text-sm font-semibold text-gray-700">Свои</span>
          </div>
          <p className="text-xs text-gray-400">Мессенджер для своих</p>
        </div>
      </footer>
    </div>
  )
}

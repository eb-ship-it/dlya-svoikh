export default function QuestionCard({ text, label, variant = 'hero' }) {
  if (variant === 'light') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        {label && (
          <div className="text-[11px] uppercase tracking-wider font-bold text-violet-600 mb-2">
            {label}
          </div>
        )}
        <div className="text-lg font-semibold text-gray-900 leading-snug">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-pink-500 text-white rounded-2xl p-6">
      {label && (
        <div className="text-[11px] uppercase tracking-wider font-semibold opacity-85 mb-2">
          {label}
        </div>
      )}
      <div className="text-lg font-semibold leading-snug relative z-10">
        {text}
      </div>
      <div className="absolute -right-5 -bottom-5 text-[90px] leading-none opacity-15 select-none pointer-events-none">
        ?
      </div>
    </div>
  )
}

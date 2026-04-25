import { useState } from 'react'
import Avatar from './Avatar'

const REACTIONS = ['🤍', '😂', '🥲', '😮']

export default function RitualRevealCelebration({
  question,
  myAnswer,
  partnerAnswer,
  myUsername,
  partnerProfile,
  streak,
  frozen,
  onChat,
}) {
  const [picked, setPicked] = useState(null)

  return (
    <div className="space-y-4">
      <div className="text-center py-5">
        <div className="text-5xl mb-2">💌</div>
        <div className="text-xl font-bold text-violet-600">Открылось!</div>
        {streak > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {streak}-й день {frozen ? '❄️' : '🔥'}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="text-base font-semibold text-gray-900 leading-snug">
          {question?.text}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Avatar username={myUsername} size="sm" />
          <div className="text-xs font-semibold text-violet-600">Ты</div>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
          {myAnswer?.content}
        </div>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl border-2 border-violet-300 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Avatar username={partnerProfile?.username} size="sm" />
          <div className="text-xs font-semibold text-amber-700">
            {partnerProfile?.display_name || partnerProfile?.username}
          </div>
        </div>
        <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
          {partnerAnswer?.content}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {REACTIONS.map(r => (
          <button
            key={r}
            onClick={() => setPicked(p => (p === r ? null : r))}
            className={`px-3 py-1.5 rounded-full text-base border transition-colors ${
              picked === r
                ? 'bg-gradient-to-br from-violet-100 to-pink-100 border-transparent'
                : 'bg-white border-gray-200'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {onChat && (
        <button
          onClick={onChat}
          className="w-full border border-gray-200 bg-white text-violet-700 font-semibold py-3 rounded-xl"
        >
          Написать в чат →
        </button>
      )}
    </div>
  )
}

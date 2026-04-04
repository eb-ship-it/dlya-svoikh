import { useState } from 'react'
import { supabase } from '../lib/supabase'
import MayachokIcon from './MayachokIcon'

const TYPE_LABELS = {
  tip: 'совет',
  motivation: 'мотивация',
  fact: 'факт',
  reminder: 'напоминание',
}

export default function MayachokCard({ post }) {
  const [rating, setRating] = useState(post.rating)

  async function rate(value) {
    const newRating = rating === value ? null : value
    setRating(newRating)
    await supabase
      .from('mayachok_posts')
      .update({ rating: newRating })
      .eq('id', post.id)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex">
        <div className="w-1 bg-gradient-to-b from-violet-400 to-pink-400 flex-shrink-0" />
        <div className="p-4 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <MayachokIcon size={18} />
              <span className="font-semibold text-violet-700 text-sm">Маячок</span>
              <span className="text-[11px] text-violet-400 bg-violet-100 px-1.5 py-0.5 rounded-md">
                {TYPE_LABELS[post.post_type] || post.post_type}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">{formatTime(post.created_at)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>

          {/* Rating buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => rate(1)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm transition-all ${
                rating === 1
                  ? 'bg-violet-100 border-[1.5px] border-violet-400 text-violet-700'
                  : 'bg-white border-[1.5px] border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              👍 <span className="text-xs">Полезно</span>
            </button>
            <button
              onClick={() => rate(-1)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm transition-all ${
                rating === -1
                  ? 'bg-gray-100 border-[1.5px] border-gray-400 text-gray-700'
                  : 'bg-white border-[1.5px] border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              👎
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

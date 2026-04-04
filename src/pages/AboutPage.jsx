import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AboutPage({ onClose }) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ friends: 0, messages: 0, posts: 0 })
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const [friendsRes, messagesRes, postsRes] = await Promise.all([
      supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id),
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])
    setStats({
      friends: friendsRes.count || 0,
      messages: messagesRes.count || 0,
      posts: postsRes.count || 0,
    })
  }

  async function submit(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    await supabase.from('suggestions').insert({
      user_id: user.id,
      content: text.trim(),
    })
    setText('')
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
  }

  function pluralize(n, one, few, many) {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod100 >= 11 && mod100 <= 19) return many
    if (mod10 === 1) return one
    if (mod10 >= 2 && mod10 <= 4) return few
    return many
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[85dvh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <div className="flex justify-end px-4 pt-3">
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">

          {/* Logo + title */}
          <div className="text-center">
            <img src="/icon.svg" alt="" className="w-20 h-20 rounded-2xl mx-auto mb-3 shadow-lg" />
            <h2 className="text-xl font-bold text-gray-800">Свои</h2>
            <p className="text-gray-400 text-sm">Мессенджер для своих</p>
          </div>

          {/* Warm message */}
          <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-4 text-center">
            <p className="text-gray-700 text-sm leading-relaxed">
              Спасибо, что ты с нами!<br />
              Ты один из первых пользователей <b>Свои</b>
            </p>
          </div>

          {/* Stats */}
          <p className="text-xs text-gray-400 text-center -mb-4">Твоя история в цифрах</p>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.friends}</div>
              <div className="text-xs text-gray-400">{pluralize(stats.friends, 'друг', 'друга', 'друзей')}</div>
            </div>
            <div className="w-px bg-gray-100"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.messages}</div>
              <div className="text-xs text-gray-400">{pluralize(stats.messages, 'сообщение', 'сообщения', 'сообщений')}</div>
            </div>
            <div className="w-px bg-gray-100"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.posts}</div>
              <div className="text-xs text-gray-400">{pluralize(stats.posts, 'пост', 'поста', 'постов')}</div>
            </div>
          </div>

          {/* Suggestion form */}
          <form onSubmit={submit}>
            <h3 className="font-semibold text-gray-800 text-sm mb-2">Помоги сделать лучше</h3>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Расскажи, чего не хватает или что можно улучшить..."
              rows={3}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200 mb-3"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-all"
            >
              {sending ? '...' : sent ? 'Отправлено! Спасибо!' : 'Отправить'}
            </button>
          </form>

          {/* Version */}
          <p className="text-center text-[11px] text-gray-300">версия 1.0</p>
        </div>
      </div>
    </div>
  )
}

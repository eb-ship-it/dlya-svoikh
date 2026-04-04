import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'

export default function CreateGroupPage({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(1) // 1 = name, 2 = select friends, 3 = done
  const [direction, setDirection] = useState('forward')

  useEffect(() => { loadFriends() }, [])

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (!data?.length) return

    const otherIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', otherIds)

    setFriends(profiles || [])
  }

  function toggle(id) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function goToStep(n) {
    setDirection(n > step ? 'forward' : 'back')
    setStep(n)
  }

  async function createGroup() {
    if (!name.trim() || selected.size === 0) return
    setCreating(true)

    const chatId = crypto.randomUUID()
    const inviteCode = crypto.randomUUID().slice(0, 8)

    await supabase.from('chats').insert({
      id: chatId,
      name: name.trim(),
      created_by: user.id,
      invite_code: inviteCode,
    })

    const participants = [
      { chat_id: chatId, user_id: user.id },
      ...[...selected].map(uid => ({ chat_id: chatId, user_id: uid })),
    ]
    await supabase.from('chat_participants').insert(participants)

    setStep(3)
    setTimeout(() => {
      onClose()
      navigate('/chats', { state: { openChatId: chatId } })
    }, 1500)
  }

  const filtered = search.trim()
    ? friends.filter(f => {
        const q = search.trim().toLowerCase()
        return f.username.toLowerCase().includes(q) ||
          (f.display_name && f.display_name.toLowerCase().includes(q))
      })
    : friends

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full h-full md:h-auto md:max-h-[85dvh] md:max-w-md md:rounded-2xl flex flex-col shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-4 animate-bounce">
              {name.trim()[0].toUpperCase()}
            </div>
            <p className="text-xl font-bold text-gray-800 mb-1">Группа создана!</p>
            <p className="text-gray-400 text-sm">«{name.trim()}» — {selected.size + 1} участников</p>
          </div>
        )}

        {/* Step 1: Name */}
        {step === 1 && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button onClick={onClose} className="text-gray-400 text-sm w-16">Отмена</button>
              <span className="font-semibold text-gray-800">Новая группа</span>
              <div className="w-16"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-lg transition-all">
                {name.trim() ? name.trim()[0].toUpperCase() : (
                  <svg className="w-10 h-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Как назовём группу?"
                autoFocus
                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-base text-center text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-200 mb-3"
              />
              <p className="text-xs text-gray-400 mb-6">Название можно будет изменить позже</p>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => goToStep(2)}
                disabled={!name.trim()}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 disabled:opacity-30 text-white font-medium py-3 rounded-xl transition-all"
              >
                Далее
              </button>
            </div>
          </>
        )}

        {/* Step 2: Select friends */}
        {step === 2 && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <button onClick={() => goToStep(1)} className="text-violet-500 text-sm w-16">Назад</button>
              <span className="font-semibold text-gray-800">Участники</span>
              <button
                onClick={createGroup}
                disabled={selected.size === 0 || creating}
                className="text-violet-500 text-sm font-medium disabled:text-gray-300 w-16 text-right"
              >
                {creating ? '...' : 'Создать'}
              </button>
            </div>

            {/* Group preview */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-pink-50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {name.trim()[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800 text-sm truncate">{name.trim()}</div>
                  <div className="text-xs text-gray-500">
                    {selected.size === 0
                      ? 'Выбери участников'
                      : `${selected.size} ${selected.size === 1 ? 'участник' : selected.size < 5 ? 'участника' : 'участников'} + ты`
                    }
                  </div>
                </div>
              </div>

              {/* Selected chips */}
              {selected.size > 0 && (
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  {[...selected].map(id => {
                    const f = friends.find(fr => fr.id === id)
                    return (
                      <button
                        key={id}
                        onClick={() => toggle(id)}
                        className="flex items-center gap-1 bg-white text-violet-700 text-xs px-2 py-1 rounded-full flex-shrink-0 shadow-sm"
                      >
                        <div className={`w-4 h-4 bg-gradient-to-br ${avatarGradient(f?.username)} rounded-full flex items-center justify-center text-white text-[8px] font-bold`}>
                          {f?.username?.[0]?.toUpperCase()}
                        </div>
                        {f?.display_name?.split(' ')[0] || f?.username}
                        <span className="text-violet-300 ml-0.5">×</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="px-4 py-2 border-b border-gray-50">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по друзьям..."
                className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {friends.length === 0 ? 'Нет друзей для добавления' : 'Никого не найдено'}
                </div>
              ) : (
                filtered.map(f => {
                  const isSelected = selected.has(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(f.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50 active:bg-gray-100'}`}
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient(f.username)} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                        {f.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm">{f.display_name || f.username}</div>
                        {f.display_name && <div className="text-xs text-gray-400">@{f.username}</div>}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-violet-500 border-violet-500 scale-110' : 'border-gray-300'}`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

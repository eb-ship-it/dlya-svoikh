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
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState(1) // 1 = select friends, 2 = name

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

    onClose()
    navigate('/chats', { state: { openChatId: chatId } })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[85dvh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          {step === 2 ? (
            <button onClick={() => setStep(1)} className="text-violet-500 text-sm">Назад</button>
          ) : (
            <button onClick={onClose} className="text-gray-400 text-sm">Отмена</button>
          )}
          <span className="font-semibold text-gray-800">
            {step === 1 ? 'Выбери участников' : 'Название группы'}
          </span>
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={selected.size === 0}
              className="text-violet-500 text-sm font-medium disabled:text-gray-300"
            >
              Далее
            </button>
          ) : (
            <button
              onClick={createGroup}
              disabled={!name.trim() || creating}
              className="text-violet-500 text-sm font-medium disabled:text-gray-300"
            >
              {creating ? '...' : 'Создать'}
            </button>
          )}
        </div>

        {step === 1 ? (
          <>
            {/* Selected chips */}
            {selected.size > 0 && (
              <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-50">
                {[...selected].map(id => {
                  const f = friends.find(fr => fr.id === id)
                  return (
                    <button
                      key={id}
                      onClick={() => toggle(id)}
                      className="flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs px-2.5 py-1.5 rounded-full flex-shrink-0"
                    >
                      {f?.display_name || f?.username}
                      <span className="text-violet-400">×</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Нет друзей для добавления</div>
              ) : (
                friends.map(f => {
                  const isSelected = selected.has(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggle(f.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient(f.username)} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                        {f.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 text-sm">{f.display_name || f.username}</div>
                        {f.display_name && <div className="text-xs text-gray-400">@{f.username}</div>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-gray-300'}`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        ) : (
          <div className="p-4">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
              {name.trim() ? name.trim()[0].toUpperCase() : '?'}
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Название группы"
              autoFocus
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-200 mb-2"
            />
            <p className="text-xs text-gray-400 text-center">{selected.size} участников + ты</p>
          </div>
        )}
      </div>
    </div>
  )
}

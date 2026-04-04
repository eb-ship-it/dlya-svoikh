import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'
import { useNavigate } from 'react-router-dom'

export default function UserPopup({ userId, username, displayName, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [friendship, setFriendship] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Don't show popup for yourself
  if (userId === user.id) { onClose(); return null }

  useEffect(() => {
    checkFriendship()
  }, [userId])

  async function checkFriendship() {
    const { data } = await supabase
      .from('friendships')
      .select('id, status, requester_id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .single()
    setFriendship(data)
    setLoading(false)
  }

  async function sendRequest() {
    setSending(true)
    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: userId })
    await checkFriendship()
    setSending(false)
  }

  async function startChat() {
    // Find existing chat
    const { data: myChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id)

    const myChatIds = (myChats || []).map(r => r.chat_id)

    if (myChatIds.length > 0) {
      const { data: shared } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId)
        .in('chat_id', myChatIds)

      if (shared?.length) {
        onClose()
        navigate('/chats')
        return
      }
    }

    // Create new chat
    const chatId = crypto.randomUUID()
    await supabase.from('chats').insert({ id: chatId })
    await supabase.from('chat_participants').insert([
      { chat_id: chatId, user_id: user.id },
      { chat_id: chatId, user_id: userId },
    ])
    onClose()
    navigate('/chats')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className={`w-16 h-16 bg-gradient-to-br ${avatarGradient(username)} rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3`}>
            {username?.[0]?.toUpperCase()}
          </div>
          {displayName && <p className="font-semibold text-gray-800">{displayName}</p>}
          <p className={displayName ? 'text-gray-400 text-sm' : 'font-semibold text-gray-800'}>@{username}</p>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-2">...</div>
        ) : (
          <div className="space-y-2">
            {!friendship ? (
              <button
                onClick={sendRequest}
                disabled={sending}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl"
              >
                {sending ? '...' : 'Добавить в друзья'}
              </button>
            ) : friendship.status === 'pending' ? (
              <div className="text-center text-gray-400 text-sm py-2">Запрос отправлен</div>
            ) : (
              <>
                <div className="text-center text-sm text-violet-500 font-medium py-1">Вы друзья</div>
                <button
                  onClick={startChat}
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium py-2.5 rounded-xl"
                >
                  Написать
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-600 text-sm font-medium py-2.5 rounded-xl"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

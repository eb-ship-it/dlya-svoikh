import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function GroupInvitePage() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [groupName, setGroupName] = useState('')

  useEffect(() => {
    handleJoin()
  }, [])

  async function handleJoin() {
    const { data: chat } = await supabase
      .from('chats')
      .select('id, name')
      .eq('invite_code', code)
      .single()

    if (!chat) { setStatus('not_found'); return }

    setGroupName(chat.name)

    // Check if already a member
    const { data: existing } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('chat_id', chat.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      navigate('/chats', { state: { openChatId: chat.id }, replace: true })
      return
    }

    // Join the group via secure RPC
    const { error } = await supabase.rpc('join_group_by_invite', { invite_code_param: code })
    if (error) { setStatus('not_found'); return }
    setStatus('done')
    setTimeout(() => navigate('/chats', { state: { openChatId: chat.id }, replace: true }), 1500)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
        <img src="/icon.svg" alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg" />
        {status === 'loading' && <p className="text-gray-500">Присоединяемся к группе...</p>}
        {status === 'done' && (
          <>
            <p className="text-lg font-semibold text-gray-800 mb-1">Добро пожаловать!</p>
            <p className="text-gray-500 text-sm">Вы присоединились к «{groupName}»</p>
          </>
        )}
        {status === 'not_found' && (
          <>
            <p className="text-gray-800 font-medium mb-1">Группа не найдена</p>
            <p className="text-gray-400 text-sm mb-3">Ссылка недействительна</p>
            <button onClick={() => navigate('/feed', { replace: true })} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm px-5 py-2 rounded-xl">
              На главную
            </button>
          </>
        )}
      </div>
    </div>
  )
}

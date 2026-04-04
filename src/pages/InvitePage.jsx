import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function InvitePage() {
  const { username } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    handleInvite()
  }, [])

  async function handleInvite() {
    // Find the inviter
    const { data: inviter } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (!inviter) { setStatus('not_found'); return }
    if (inviter.id === user.id) { navigate('/feed', { replace: true }); return }

    // Check if already friends
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${inviter.id}),and(requester_id.eq.${inviter.id},addressee_id.eq.${user.id})`)
      .single()

    if (existing) {
      navigate('/feed', { replace: true })
      return
    }

    // Auto-accept: create friendship as accepted (current user must be requester for RLS)
    await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: inviter.id,
      status: 'accepted',
    })

    setStatus('done')
    setTimeout(() => navigate('/friends', { replace: true }), 1500)
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
        <img src="/icon.svg" alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg" />
        {status === 'loading' && <p className="text-gray-500">Добавляем в друзья...</p>}
        {status === 'done' && (
          <>
            <p className="text-lg font-semibold text-gray-800 mb-1">Готово!</p>
            <p className="text-gray-500 text-sm">Вы с @{username} теперь друзья</p>
          </>
        )}
        {status === 'not_found' && (
          <>
            <p className="text-gray-800 font-medium mb-1">Пользователь не найден</p>
            <button onClick={() => navigate('/feed', { replace: true })} className="mt-3 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm px-5 py-2 rounded-xl">
              На главную
            </button>
          </>
        )}
      </div>
    </div>
  )
}

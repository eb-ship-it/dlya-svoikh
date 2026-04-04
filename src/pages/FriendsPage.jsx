import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'

export default function FriendsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadAll()

    const channel = supabase
      .channel('friendships')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, () => loadAll())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadAll() {
    try {
      const { data, error: e } = await supabase
        .from('friendships')
        .select('id, status, requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (e) throw e

      if (!data?.length) {
        setFriends([]); setIncoming([]); setOutgoing([]); setError(''); setLoading(false); return
      }

      const otherIds = [...new Set(data.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', otherIds)

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      const accepted = [], inc = [], out = []
      for (const f of data) {
        const isMine = f.requester_id === user.id
        const otherId = isMine ? f.addressee_id : f.requester_id
        const other = { id: otherId, username: profileMap[otherId]?.username, displayName: profileMap[otherId]?.display_name, friendshipId: f.id }

        if (f.status === 'accepted') accepted.push(other)
        else if (isMine) out.push(other)
        else inc.push(other)
      }

      setFriends(accepted)
      setIncoming(inc)
      setOutgoing(out)
      setError('')
    } catch (err) {
      console.error('loadFriends error:', err)
      setError('Не удалось загрузить друзей')
    } finally {
      setLoading(false)
    }
  }

  async function searchUser() {
    setSearchError('')
    setSearchResults([])
    const q = search.trim().toLowerCase()
    if (!q || q.length < 2) { setSearchError('Введи минимум 2 символа'); return }
    setSearchLoading(true)

    // Search by username or display_name
    const { data: byUsername } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .ilike('username', `%${q}%`)
      .neq('id', user.id)
      .limit(10)

    const { data: byName } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .ilike('display_name', `%${q}%`)
      .neq('id', user.id)
      .limit(10)

    // Merge and deduplicate
    const merged = [...(byUsername || []), ...(byName || [])]
    const unique = [...new Map(merged.map(p => [p.id, p])).values()]

    if (!unique.length) {
      setSearchError('Никого не найдено')
      setSearchLoading(false)
      return
    }

    // Check friendship status for all results
    const { data: existingFriendships } = await supabase
      .from('friendships')
      .select('id, status, requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const friendshipMap = {}
    for (const f of existingFriendships || []) {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
      friendshipMap[otherId] = f
    }

    setSearchResults(unique.map(p => ({ ...p, friendship: friendshipMap[p.id] || null })))
    setSearchLoading(false)
  }

  async function sendRequest(addresseeId) {
    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId })
    setSearchResults([])
    setSearch('')
    loadAll()
  }

  async function accept(friendshipId) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    loadAll()
  }

  async function decline(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    loadAll()
  }

  async function goToChat(friendId) {
    const { data: myChats } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id)

    const myChatIds = (myChats || []).map(r => r.chat_id)
    if (myChatIds.length > 0) {
      const { data: shared } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', friendId)
        .in('chat_id', myChatIds)
      if (shared?.length) {
        navigate('/chats', { state: { openChatId: shared[0].chat_id } })
        return
      }
    }

    const chatId = crypto.randomUUID()
    await supabase.from('chats').insert({ id: chatId })
    await supabase.from('chat_participants').insert([
      { chat_id: chatId, user_id: user.id },
      { chat_id: chatId, user_id: friendId },
    ])
    navigate('/chats', { state: { openChatId: chatId } })
  }

  async function removeFriend(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setDeleteConfirm(null)
    loadAll()
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Найти по имени или логину</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchResults([]); setSearchError('') }}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              placeholder="Введи логин..."
              className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <button
              onClick={searchUser}
              disabled={searchLoading}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Найти
            </button>
          </div>

          {searchError && <p className="text-gray-400 text-sm mt-2">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map(result => (
                <div key={result.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(result.username)} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                      {result.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {result.display_name && <div className="font-medium text-gray-800 text-sm truncate">{result.display_name}</div>}
                      <div className={`text-gray-400 truncate ${result.display_name ? 'text-xs' : 'text-sm font-medium text-gray-800'}`}>@{result.username}</div>
                    </div>
                  </div>
                  {!result.friendship ? (
                    <button
                      onClick={() => sendRequest(result.id)}
                      className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                    >
                      Добавить
                    </button>
                  ) : result.friendship.status === 'pending' ? (
                    <span className="text-xs text-gray-400 flex-shrink-0">Отправлено</span>
                  ) : (
                    <span className="text-xs text-green-500 flex-shrink-0">Друзья</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Заявки в друзья
              <span className="ml-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full">{incoming.length}</span>
            </h3>
            <div className="space-y-2">
              {incoming.map(f => (
                <div key={f.friendshipId} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium text-gray-800 text-sm">{f.username}</span>
                  <button onClick={() => accept(f.friendshipId)} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-lg">
                    Принять
                  </button>
                  <button onClick={() => decline(f.friendshipId)} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg">
                    Отклонить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            Друзья
            {friends.length > 0 && <span className="ml-2 text-gray-400 font-normal text-sm">{friends.length}</span>}
          </h3>
          {loading ? (
            <p className="text-gray-400 text-sm">Загрузка...</p>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button onClick={() => { setLoading(true); setError(''); loadAll() }} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm px-4 py-2 rounded-xl">Повторить</button>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">👥</span>
              </div>
              <p className="text-sm font-medium text-gray-500">Друзей пока нет</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {friends.map(f => (
                <div key={f.friendshipId} className="flex items-center gap-3 py-2.5">
                  <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient(f.username)} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 text-sm block truncate">{f.displayName || f.username}</span>
                    {f.displayName && <span className="text-xs text-gray-400">@{f.username}</span>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => goToChat(f.id)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                      title="Написать"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(f)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-50 transition-colors"
                      title="Удалить из друзей"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outgoing requests */}
        {outgoing.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm text-gray-500">Отправленные заявки</h3>
            <div className="space-y-2">
              {outgoing.map(f => (
                <div key={f.friendshipId} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium text-gray-700 text-sm">{f.username}</span>
                  <span className="text-xs text-gray-400">ожидает...</span>
                  <button onClick={() => decline(f.friendshipId)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 font-medium text-center mb-1">Удалить из друзей?</p>
            <p className="text-gray-400 text-sm text-center mb-5">{deleteConfirm.username} будет удалён из списка друзей</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => removeFriend(deleteConfirm.friendshipId)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

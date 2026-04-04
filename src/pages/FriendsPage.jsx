import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        .select('id, username')
        .in('id', otherIds)

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

      const accepted = [], inc = [], out = []
      for (const f of data) {
        const isMine = f.requester_id === user.id
        const otherId = isMine ? f.addressee_id : f.requester_id
        const other = { id: otherId, username: profileMap[otherId]?.username, friendshipId: f.id }

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
    setSearchResult(null)
    const q = search.trim().toLowerCase()
    if (!q) return
    setSearchLoading(true)

    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', q)
      .neq('id', user.id)
      .single()

    if (!data) {
      setSearchError('Пользователь не найден')
    } else {
      // Check if already friends or pending
      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${data.id}),and(requester_id.eq.${data.id},addressee_id.eq.${user.id})`)
        .single()

      setSearchResult({ ...data, friendship: existing })
    }
    setSearchLoading(false)
  }

  async function sendRequest(addresseeId) {
    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId })
    setSearchResult(null)
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

  async function removeFriend(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    loadAll()
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Найти друга</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSearchResult(null); setSearchError('') }}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              placeholder="Введи логин..."
              className="flex-1 bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={searchUser}
              disabled={searchLoading}
              className="bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:bg-blue-300"
            >
              Найти
            </button>
          </div>

          {searchError && <p className="text-red-500 text-sm mt-2">{searchError}</p>}

          {searchResult && (
            <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                  {searchResult.username[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-800 text-sm">{searchResult.username}</span>
              </div>
              {!searchResult.friendship ? (
                <button
                  onClick={() => sendRequest(searchResult.id)}
                  className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg"
                >
                  Добавить
                </button>
              ) : searchResult.friendship.status === 'pending' ? (
                <span className="text-xs text-gray-400">Запрос отправлен</span>
              ) : (
                <span className="text-xs text-green-500">Уже друзья</span>
              )}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Заявки в друзья
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{incoming.length}</span>
            </h3>
            <div className="space-y-2">
              {incoming.map(f => (
                <div key={f.friendshipId} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium text-sm flex-shrink-0">
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium text-gray-800 text-sm">{f.username}</span>
                  <button onClick={() => accept(f.friendshipId)} className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg">
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
              <button onClick={() => { setLoading(true); setError(''); loadAll() }} className="bg-blue-500 text-white text-sm px-4 py-2 rounded-xl">Повторить</button>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm">Друзей пока нет</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map(f => (
                <div key={f.friendshipId} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm flex-shrink-0">
                    {f.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium text-gray-800 text-sm">{f.username}</span>
                  <button
                    onClick={() => removeFriend(f.friendshipId)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    title="Удалить из друзей"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                  <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm flex-shrink-0">
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
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ChatWindow from '../components/ChatWindow'

export default function ChatsPage() {
  const { user, profile } = useAuth()
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChats()
    loadFriends()
  }, [user])

  async function loadChats() {
    const { data: participantRows } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id)

    if (!participantRows?.length) { setChats([]); setLoading(false); return }

    const chatIds = participantRows.map(r => r.chat_id)

    // Batch: get partners, all messages in parallel
    const [partnersRes, messagesRes] = await Promise.all([
      supabase
        .from('chat_participants')
        .select('chat_id, user_id, profiles(username)')
        .in('chat_id', chatIds)
        .neq('user_id', user.id),
      supabase
        .from('messages')
        .select('chat_id, content, created_at, sender_id, read_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false }),
    ])

    const partners = partnersRes.data || []
    const allMessages = messagesRes.data || []

    // Group messages by chat
    const msgByChat = {}
    for (const m of allMessages) {
      if (!msgByChat[m.chat_id]) msgByChat[m.chat_id] = []
      msgByChat[m.chat_id].push(m)
    }

    const chatList = partners.map(cp => {
      const msgs = msgByChat[cp.chat_id] || []
      const lastMsg = msgs[0]
      const unread = msgs.filter(m => m.sender_id !== user.id && !m.read_at).length
      return {
        id: cp.chat_id,
        partnerUsername: cp.profiles?.username,
        lastMessage: lastMsg?.content || '',
        lastAt: lastMsg?.created_at || '',
        unread,
      }
    })

    chatList.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
    setChats(chatList)
    setLoading(false)
  }

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (!data?.length) { setFriends([]); return }

    const otherIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', otherIds)

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    const list = data.map(f => {
      const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
      return { id: otherId, username: profileMap[otherId]?.username }
    })
    setFriends(list)
  }

  async function openOrCreateChat(friendId) {
    // Check if chat already exists between me and friend
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
        setActiveChatId(shared[0].chat_id)
        return
      }
    }

    // Create new chat with client-generated ID (avoids RLS read-back issue)
    const chatId = crypto.randomUUID()
    await supabase.from('chats').insert({ id: chatId })
    await supabase.from('chat_participants').insert([
      { chat_id: chatId, user_id: user.id },
      { chat_id: chatId, user_id: friendId },
    ])

    await loadChats()
    setActiveChatId(chatId)
  }

  const activeChat = chats.find(c => c.id === activeChatId)

  // On mobile: show list OR chat window
  const showList = !activeChatId

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar: chat list */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-gray-100 bg-white`}>
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-lg">Чаты</h2>
        </div>

        {/* Friends to start chats */}
        {friends.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Начать чат</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {friends.map(f => (
                <button
                  key={f.id}
                  onClick={() => openOrCreateChat(f.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                    {f.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500 max-w-12 truncate">{f.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-visible">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Загрузка...</div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">
              <div className="text-3xl mb-2">💬</div>
              <p>Нет чатов</p>
              <p className="text-xs mt-1">Добавь друзей во вкладке Друзья</p>
            </div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${activeChatId === chat.id ? 'bg-blue-50' : ''}`}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                    {chat.partnerUsername?.[0]?.toUpperCase() || '?'}
                  </div>
                  {chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-5 h-5 rounded-full flex items-center justify-center px-1">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${chat.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{chat.partnerUsername}</div>
                  <div className={`text-xs truncate ${chat.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{chat.lastMessage || 'Нет сообщений'}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={`${activeChatId ? 'flex' : 'hidden md:flex'} flex-col flex-1`}>
        {activeChatId ? (
          <ChatWindow
            chatId={activeChatId}
            partnerUsername={activeChat?.partnerUsername}
            onBack={() => { setActiveChatId(null); loadChats() }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">💬</div>
              <p>Выбери чат слева</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

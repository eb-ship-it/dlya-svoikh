import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'
import ChatWindow from '../components/ChatWindow'
import CreateGroupPage from './CreateGroupPage'

export default function ChatsPage() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  useEffect(() => {
    loadChats()
    loadFriends()
  }, [user])

  // Open specific chat if navigated with state
  useEffect(() => {
    if (location.state?.openChatId) {
      setActiveChatId(location.state.openChatId)
      // Clear state so it doesn't reopen on tab switch
      window.history.replaceState({}, '')
    }
  }, [location.state])

  async function loadChats() {
    try {
      const { data: participantRows, error: e1 } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id)

      if (e1) throw e1
      if (!participantRows?.length) { setChats([]); setLoading(false); return }

      const chatIds = participantRows.map(r => r.chat_id)

      const [partnersRes, messagesRes, chatsRes] = await Promise.all([
        supabase
          .from('chat_participants')
          .select('chat_id, user_id, profiles(username, display_name)')
          .in('chat_id', chatIds)
          .neq('user_id', user.id),
        supabase
          .from('messages')
          .select('chat_id, content, created_at, sender_id, read_at')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('chats')
          .select('id, name, created_by')
          .in('id', chatIds),
      ])

      if (partnersRes.error) throw partnersRes.error

      const partners = partnersRes.data || []
      const allMessages = messagesRes.data || []
      const chatInfoMap = Object.fromEntries((chatsRes.data || []).map(c => [c.id, c]))

      const msgByChat = {}
      for (const m of allMessages) {
        if (!msgByChat[m.chat_id]) msgByChat[m.chat_id] = []
        msgByChat[m.chat_id].push(m)
      }

      // Group partners by chat for group chats
      const partnersByChat = {}
      for (const cp of partners) {
        if (!partnersByChat[cp.chat_id]) partnersByChat[cp.chat_id] = []
        partnersByChat[cp.chat_id].push(cp)
      }

      const chatList = [...new Set(partners.map(p => p.chat_id))].map(chatId => {
        const chatInfo = chatInfoMap[chatId]
        const chatPartners = partnersByChat[chatId] || []
        const firstPartner = chatPartners[0]
        const msgs = msgByChat[chatId] || []
        const lastMsg = msgs[0]
        const unread = msgs.filter(m => m.sender_id !== user.id && !m.read_at).length
        const isGroup = !!chatInfo?.name
        return {
          id: chatId,
          isGroup,
          groupName: chatInfo?.name,
          partnerUsername: firstPartner?.profiles?.username,
          partnerDisplayName: firstPartner?.profiles?.display_name,
          memberCount: chatPartners.length + 1,
          lastMessage: lastMsg?.content || '',
          lastAt: lastMsg?.created_at || '',
          unread,
        }
      })

      chatList.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
      setChats(chatList)
      setError('')
    } catch (err) {
      console.error('loadChats error:', err)
      setError('Не удалось загрузить чаты. Потяни вниз для обновления.')
    } finally {
      setLoading(false)
    }
  }

  async function loadFriends() {
    try {
      const { data } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      if (!data?.length) { setFriends([]); return }

      const otherIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', otherIds)

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      const list = data.map(f => {
        const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
        return { id: otherId, username: profileMap[otherId]?.username, displayName: profileMap[otherId]?.display_name }
      })
      setFriends(list)
    } catch (err) {
      console.error('loadFriends error:', err)
    }
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
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-lg">Чаты</h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-medium px-3 py-1.5 rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Группа
          </button>
        </div>

        {/* Friends to start chats */}
        {friends.length > 0 && (
          <div className="px-4 py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Начать новый чат</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {friends.map(f => (
                <button
                  key={f.id}
                  onClick={() => openOrCreateChat(f.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${avatarGradient(f.username)} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
                    {f.username[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-500 max-w-12 truncate">{f.displayName || f.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Загрузка...</div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button onClick={() => { setLoading(true); setError(''); loadChats(); loadFriends() }} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm px-4 py-2 rounded-xl">Повторить</button>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💬</span>
              </div>
              <p className="font-medium text-gray-500 text-sm">Нет чатов</p>
              <p className="text-xs text-gray-400 mt-1">Добавь друзей и начни общение</p>
            </div>
          ) : (
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${activeChatId === chat.id ? 'bg-violet-50' : ''}`}
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${chat.isGroup ? 'from-violet-400 to-pink-400' : avatarGradient(chat.partnerUsername)} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}>
                  {chat.isGroup ? chat.groupName?.[0]?.toUpperCase() : chat.partnerUsername?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${chat.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{chat.isGroup ? chat.groupName : (chat.partnerDisplayName || chat.partnerUsername)}</div>
                  <div className={`text-xs truncate ${chat.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{chat.lastMessage || 'Нет сообщений'}</div>
                </div>
                {chat.unread > 0 && (
                  <span className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[10px] font-bold min-w-5 h-5 rounded-full flex items-center justify-center px-1 flex-shrink-0">
                    {chat.unread}
                  </span>
                )}
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
            partnerDisplayName={activeChat?.partnerDisplayName}
            isGroup={activeChat?.isGroup}
            groupName={activeChat?.groupName}
            onBack={() => { setActiveChatId(null); loadChats() }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p>Выбери чат слева</p>
            </div>
          </div>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupPage onClose={() => { setShowCreateGroup(false); loadChats() }} />
      )}
    </div>
  )
}

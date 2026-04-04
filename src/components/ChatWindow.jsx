import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'
import GroupSettings from './GroupSettings'

export default function ChatWindow({ chatId, partnerUsername, partnerDisplayName, isGroup, groupName, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()
    if (isGroup) loadMembers()

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        if (payload.new.sender_id !== user.id && !payload.new.read_at) {
          supabase.from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', payload.new.id)
            .then()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    markAsRead(data)
  }

  async function loadMembers() {
    const { data } = await supabase
      .from('chat_participants')
      .select('user_id, profiles(username, display_name)')
      .eq('chat_id', chatId)
    const map = {}
    for (const p of data || []) {
      map[p.user_id] = p.profiles
    }
    setMembers(map)
  }

  async function markAsRead(msgs) {
    const unread = (msgs || []).filter(m => m.sender_id !== user.id && !m.read_at)
    if (unread.length === 0) return
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unread.map(m => m.id))
    if (error) console.error('markAsRead failed:', error)
  }

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user.id,
      content: text.trim(),
    })
    setText('')
    setSending(false)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  function senderName(senderId) {
    const m = members[senderId]
    return m?.display_name || m?.username || '?'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="md:hidden text-violet-500 p-1 -ml-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {isGroup ? (
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-medium">
              {groupName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="text-left min-w-0">
              <div className="font-medium text-gray-800 truncate">{groupName}</div>
              <div className="text-xs text-gray-400">{Object.keys(members).length} участников</div>
            </div>
          </button>
        ) : (
          <>
            <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(partnerUsername)} rounded-full flex items-center justify-center text-white font-medium`}>
              {partnerUsername?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="font-medium text-gray-800">{partnerDisplayName || partnerUsername}</div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user.id
          const showSender = isGroup && !isMine &&
            (i === 0 || messages[i - 1].sender_id !== msg.sender_id)
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                isMine
                  ? 'bg-gradient-to-br from-violet-500 to-purple-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {showSender && (
                  <p className="text-xs font-medium text-violet-500 mb-0.5">{senderName(msg.sender_id)}</p>
                )}
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-100">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Сообщение..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-all flex-shrink-0"
        >
          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>

      {showSettings && (
        <GroupSettings chatId={chatId} groupName={groupName} onClose={() => setShowSettings(false)} onLeft={onBack} />
      )}
    </div>
  )
}

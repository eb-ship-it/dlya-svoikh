import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import GroupSettings from './GroupSettings'
import LinkifyText from './LinkifyText'

export default function ChatWindow({ chatId, partnerUsername, partnerDisplayName, isGroup, groupName, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState({})
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const bottomRef = useRef(null)
  const messagesRef = useRef([])
  const inputRef = useRef(null)

  useEffect(() => { messagesRef.current = messages }, [messages])

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
      }, async (payload) => {
        let newMsg = payload.new
        // Enrich reply_to from existing messages or fetch
        if (newMsg.reply_to_id) {
          const existing = messagesRef.current.find(m => m.id === newMsg.reply_to_id)
          if (existing) {
            newMsg = { ...newMsg, reply_to: { id: existing.id, sender_id: existing.sender_id, content: existing.content } }
          } else {
            const { data } = await supabase.from('messages').select('id, sender_id, content').eq('id', newMsg.reply_to_id).single()
            newMsg = { ...newMsg, reply_to: data }
          }
        }
        setMessages(prev => [...prev, newMsg])
        if (newMsg.sender_id !== user.id && !newMsg.read_at) {
          supabase.from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', newMsg.id)
            .then(({ error }) => { if (error) console.error('mark read error:', error) })
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
      .select('*, reply_to:reply_to_id(id, sender_id, content)')
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
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: text.trim(),
        ...(replyTo && { reply_to_id: replyTo.id }),
      })
      if (error) throw error
      setText('')
      setReplyTo(null)
    } catch (err) {
      console.error('send message error:', err)
    } finally {
      setSending(false)
    }
  }

  function handleReply(msg) {
    setReplyTo({ id: msg.id, sender_id: msg.sender_id, content: msg.content })
    inputRef.current?.focus()
  }

  function scrollToMessage(msgId) {
    const el = document.getElementById(`msg-${msgId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('highlight-flash')
      setTimeout(() => el.classList.remove('highlight-flash'), 1500)
    }
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  function senderName(senderId) {
    const m = members[senderId]
    return m?.display_name || m?.username || '?'
  }

  function replySenderName(senderId) {
    if (senderId === user.id) return 'Вы'
    if (isGroup) return senderName(senderId)
    return partnerDisplayName || partnerUsername || '?'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="md:hidden text-violet-500 p-1 -ml-1" aria-label="Назад">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {isGroup ? (
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar isGroup groupName={groupName} size="md" />
            <div className="text-left min-w-0">
              <div className="font-medium text-gray-800 truncate">{groupName}</div>
              <div className="text-xs text-gray-400">{Object.keys(members).length} участников</div>
            </div>
          </button>
        ) : (
          <>
            <Avatar username={partnerUsername} size="md" />
            <div className="font-medium text-gray-800">{partnerDisplayName || partnerUsername}</div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-2 bg-gray-50">
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === user.id
          const showSender = isGroup && !isMine &&
            (i === 0 || messages[i - 1].sender_id !== msg.sender_id)
          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group relative`}>
              {/* Reply button — desktop only, absolute positioned */}
              {isMine && (
                <button
                  onClick={() => handleReply(msg)}
                  className="absolute top-1/2 -translate-y-1/2 -left-1 -translate-x-full hidden md:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-gray-100 items-center justify-center text-gray-400 hover:text-violet-500 transition-all"
                  aria-label="Ответить"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v4M3 10l6-6M3 10l6 6" />
                  </svg>
                </button>
              )}

              <div
                style={{ maxWidth: '75%', wordBreak: 'break-word', overflowWrap: 'break-word' }}
                className={`min-w-0 px-4 py-2 rounded-2xl text-sm leading-relaxed overflow-hidden ${
                isMine
                  ? 'bg-gradient-to-br from-violet-500 to-purple-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                {showSender && (
                  <p className="text-xs font-medium text-violet-500 mb-0.5">{senderName(msg.sender_id)}</p>
                )}

                {/* Reply quote */}
                {msg.reply_to && (
                  <div
                    onClick={() => scrollToMessage(msg.reply_to.id)}
                    className={`mb-1.5 p-2 rounded-lg cursor-pointer border-l-2 overflow-hidden ${
                      isMine
                        ? 'border-purple-300 bg-white/15'
                        : 'border-violet-400 bg-violet-50'
                    }`}
                  >
                    <p className={`text-[11px] font-medium truncate ${isMine ? 'text-purple-200' : 'text-violet-600'}`}>
                      {replySenderName(msg.reply_to.sender_id)}
                    </p>
                    <p className={`text-[11px] truncate ${isMine ? 'text-purple-200/70' : 'text-gray-500'}`}>
                      {msg.reply_to.content.length > 100 ? msg.reply_to.content.slice(0, 100) + '...' : msg.reply_to.content}
                    </p>
                  </div>
                )}

                <p style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}><LinkifyText text={msg.content} /></p>
                <div className={`flex items-center justify-end gap-2 mt-1 ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                  <button
                    onClick={() => handleReply(msg)}
                    className="md:hidden"
                    aria-label="Ответить"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v4M3 10l6-6M3 10l6 6" />
                    </svg>
                  </button>
                  <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                </div>
              </div>

              {/* Reply button — desktop only, absolute positioned */}
              {!isMine && (
                <button
                  onClick={() => handleReply(msg)}
                  className="absolute top-1/2 -translate-y-1/2 -right-1 translate-x-full hidden md:flex opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-gray-100 items-center justify-center text-gray-400 hover:text-violet-500 transition-all"
                  aria-label="Ответить"
                >
                  <svg className="w-3.5 h-3.5 scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v4M3 10l6-6M3 10l6 6" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 border-t border-violet-100">
          <div className="w-1 self-stretch bg-violet-400 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-violet-600 truncate">
              {replySenderName(replyTo.sender_id)}
            </p>
            <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 p-1 flex-shrink-0" aria-label="Отменить ответ">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={send} className="flex items-end gap-2 px-4 py-3 bg-white border-t border-gray-100">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Сообщение..."
          maxLength={5000}
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

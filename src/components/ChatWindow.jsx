import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ChatWindow({ chatId, partnerUsername, onBack }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        // Mark incoming message as read immediately since chat is open
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

  async function markAsRead(msgs) {
    const unread = (msgs || []).filter(m => m.sender_id !== user.id && !m.read_at)
    if (unread.length === 0) return
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unread.map(m => m.id))
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="md:hidden text-blue-500 p-1 -ml-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
          {partnerUsername?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="font-medium text-gray-800">{partnerUsername}</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {messages.map(msg => {
          const isMine = msg.sender_id === user.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                isMine
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
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
          className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-blue-500 disabled:bg-blue-300 rounded-full flex items-center justify-center text-white transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}

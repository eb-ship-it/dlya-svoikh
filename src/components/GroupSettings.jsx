import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'

export default function GroupSettings({ chatId, groupName: initialName, onClose, onLeft }) {
  const { user } = useAuth()
  const [chat, setChat] = useState(null)
  const [members, setMembers] = useState([])
  const [friends, setFriends] = useState([])
  const [name, setName] = useState(initialName || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(null)

  useEffect(() => { loadChat(); loadMembers() }, [chatId])

  async function loadChat() {
    const { data } = await supabase
      .from('chats')
      .select('id, name, created_by, invite_code')
      .eq('id', chatId)
      .single()
    setChat(data)
    if (data?.name) setName(data.name)
  }

  async function loadMembers() {
    const { data } = await supabase
      .from('chat_participants')
      .select('user_id, profiles(id, username, display_name)')
      .eq('chat_id', chatId)
    setMembers((data || []).map(d => d.profiles))
  }

  async function loadFriends() {
    const { data } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    if (!data?.length) { setFriends([]); return }

    const otherIds = data.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
    const memberIds = new Set(members.map(m => m.id))
    const nonMemberIds = otherIds.filter(id => !memberIds.has(id))

    if (!nonMemberIds.length) { setFriends([]); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', nonMemberIds)
    setFriends(profiles || [])
  }

  const isCreator = chat?.created_by === user.id
  const inviteLink = chat?.invite_code ? `${window.location.origin}/group/${chat.invite_code}` : ''

  async function saveName() {
    setSaving(true)
    try {
      const { error } = await supabase.from('chats').update({ name: name.trim() }).eq('id', chatId)
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('saveName error:', err)
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function addMember(friendId) {
    try {
      await supabase.from('chat_participants').insert({ chat_id: chatId, user_id: friendId })
      setShowAddMember(false)
      loadMembers()
    } catch (err) {
      console.error('addMember error:', err)
    }
  }

  async function removeMember(memberId) {
    try {
      await supabase.from('chat_participants').delete().eq('chat_id', chatId).eq('user_id', memberId)
      setConfirmRemove(null)
      loadMembers()
    } catch (err) {
      console.error('removeMember error:', err)
    }
  }

  async function leaveGroup() {
    try {
      await supabase.from('chat_participants').delete().eq('chat_id', chatId).eq('user_id', user.id)
      onLeft()
    } catch (err) {
      console.error('leaveGroup error:', err)
    }
  }

  async function deleteGroup() {
    try {
      await supabase.from('messages').delete().eq('chat_id', chatId)
      await supabase.from('chat_participants').delete().eq('chat_id', chatId)
      await supabase.from('chats').delete().eq('id', chatId)
      onLeft()
    } catch (err) {
      console.error('deleteGroup error:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md max-h-[85dvh] flex flex-col shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <button onClick={onClose} className="text-gray-400 text-sm">Закрыть</button>
          <span className="font-semibold text-gray-800">Настройки группы</span>
          <div className="w-12"></div>
        </div>

        <div className="p-4 space-y-4">

          {/* Group avatar + name */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
              {name?.[0]?.toUpperCase() || '?'}
            </div>
          </div>

          {/* Edit name (creator only) */}
          {isCreator ? (
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="text-xs text-gray-400 mb-1 block">Название</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={50}
                  className="flex-1 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <button
                  onClick={saveName}
                  disabled={saving || !name.trim()}
                  className="bg-gradient-to-r from-violet-500 to-pink-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg"
                >
                  {saving ? '...' : saved ? 'OK' : 'Сохранить'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg">{name}</p>
            </div>
          )}

          {/* Invite link */}
          {inviteLink && (
            <div className="bg-gray-50 rounded-xl p-3">
              <label className="text-xs text-gray-400 mb-1 block">Ссылка-приглашение</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 min-w-0 bg-white rounded-lg px-3 py-2 text-xs text-gray-500 focus:outline-none"
                />
                <button
                  onClick={copyLink}
                  className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs px-3 py-2 rounded-lg flex-shrink-0"
                >
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Участники ({members.length})</span>
              {isCreator && (
                <button
                  onClick={() => { loadFriends(); setShowAddMember(true) }}
                  className="text-violet-500 text-xs font-medium"
                >
                  + Добавить
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(m.username)} rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0`}>
                    {m.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 block truncate">{m.display_name || m.username}</span>
                    {m.display_name && <span className="text-xs text-gray-400">@{m.username}</span>}
                  </div>
                  {m.id === chat?.created_by && (
                    <span className="text-xs text-violet-500">создатель</span>
                  )}
                  {isCreator && m.id !== user.id && (
                    <button
                      onClick={() => setConfirmRemove(m)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full bg-gray-100 text-red-500 text-sm font-medium py-2.5 rounded-xl"
            >
              Покинуть группу
            </button>
            {isCreator && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full bg-red-50 text-red-500 text-sm font-medium py-2.5 rounded-xl"
              >
                Удалить группу
              </button>
            )}
          </div>
        </div>

        {/* Add member modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMember(false)}>
            <div className="bg-white rounded-2xl w-full max-w-sm max-h-[60dvh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-center">Добавить участника</div>
              <div className="flex-1 overflow-y-auto">
                {friends.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Все друзья уже в группе</div>
                ) : (
                  friends.map(f => (
                    <button
                      key={f.id}
                      onClick={() => addMember(f.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                    >
                      <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(f.username)} rounded-full flex items-center justify-center text-white font-medium text-sm`}>
                        {f.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{f.display_name || f.username}</div>
                        {f.display_name && <div className="text-xs text-gray-400">@{f.username}</div>}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm remove member */}
        {confirmRemove && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmRemove(null)}>
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="text-gray-800 font-medium text-center mb-1">Удалить участника?</p>
              <p className="text-gray-400 text-sm text-center mb-5">{confirmRemove.display_name || confirmRemove.username}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRemove(null)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">Отмена</button>
                <button onClick={() => removeMember(confirmRemove.id)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Удалить</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm leave */}
        {confirmLeave && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmLeave(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="text-gray-800 font-medium text-center mb-1">Покинуть группу?</p>
              <p className="text-gray-400 text-sm text-center mb-5">Вы не будете видеть сообщения</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLeave(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">Отмена</button>
                <button onClick={leaveGroup} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Покинуть</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <p className="text-gray-800 font-medium text-center mb-1">Удалить группу?</p>
              <p className="text-gray-400 text-sm text-center mb-5">Все сообщения будут удалены навсегда</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium">Отмена</button>
                <button onClick={deleteGroup} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">Удалить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

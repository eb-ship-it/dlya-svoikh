import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const inviteLink = `${window.location.origin}/invite/${profile?.username}`

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-4">

        {/* Avatar + info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className={`w-20 h-20 bg-gradient-to-br ${avatarGradient(profile?.username)} rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3`}>
            {profile?.username?.[0]?.toUpperCase()}
          </div>
          <p className="font-semibold text-gray-800">@{profile?.username}</p>
          {profile?.display_name && (
            <p className="text-gray-500 text-sm mt-1">{profile.display_name}</p>
          )}
        </div>

        {/* Edit name */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Имя и фамилия</h3>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Введи имя и фамилию"
            className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 mb-3"
          />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-all"
          >
            {saving ? '...' : saved ? 'Сохранено!' : 'Сохранить'}
          </button>
        </form>

        {/* Invite link */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-1">Пригласить друга</h3>
          <p className="text-xs text-gray-400 mb-3">Отправь ссылку — друг зарегистрируется и вы сразу станете друзьями</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 min-w-0 bg-gray-100 rounded-xl px-3 py-2.5 text-xs text-gray-600 focus:outline-none"
            />
            <button
              onClick={copyLink}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex-shrink-0 transition-all"
            >
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full bg-white rounded-2xl shadow-sm p-4 text-red-500 text-sm font-medium text-center hover:bg-red-50 transition-colors"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  )
}

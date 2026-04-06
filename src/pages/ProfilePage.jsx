import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import MayachokIcon from '../components/MayachokIcon'
import MayachokSetup from '../components/MayachokSetup'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mayachok, setMayachok] = useState(null)
  const [mayachokLoading, setMayachokLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => { loadMayachok() }, [])

  async function loadMayachok() {
    const { data } = await supabase
      .from('mayachok_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setMayachok(data)
    setMayachokLoading(false)
  }

  async function toggleMayachok() {
    if (!mayachok || !mayachok.enabled) {
      // Turning on — show setup if no goals yet
      if (!mayachok?.goals) {
        setShowSetup(true)
        return
      }
      await supabase.from('mayachok_settings').upsert({
        user_id: user.id,
        enabled: true,
        updated_at: new Date().toISOString(),
      })
    } else {
      // Turning off
      await supabase.from('mayachok_settings').update({
        enabled: false,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id)
    }
    loadMayachok()
  }

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
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName.trim() || null })
        .eq('id', user.id)
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('save profile error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-4">

        {/* Avatar + info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <Avatar username={profile?.username} size="xxl" />
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

        {/* Маячок */}
        {!mayachokLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MayachokIcon size={24} />
                <span className="font-semibold text-gray-800">Маячок</span>
                <span className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">beta</span>
              </div>
              <button
                onClick={toggleMayachok}
                className={`w-11 h-6 rounded-full transition-all relative ${mayachok?.enabled ? 'bg-gradient-to-r from-violet-500 to-pink-500' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${mayachok?.enabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Каждый день — персональный совет в твоей ленте</p>

            {mayachok?.enabled && mayachok?.goals && (
              <>
                <div className="bg-gray-50 rounded-xl p-3 mb-2">
                  <p className="text-[11px] text-gray-400 mb-1">Твои цели:</p>
                  <p className="text-sm text-gray-700">{mayachok.goals}</p>
                </div>
                <button
                  onClick={() => setShowSetup(true)}
                  className="w-full bg-gray-100 text-gray-600 text-sm py-2 rounded-xl"
                >
                  Изменить цели
                </button>
              </>
            )}
          </div>
        )}

        {showSetup && (
          <MayachokSetup
            onClose={() => setShowSetup(false)}
            onSaved={loadMayachok}
          />
        )}

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

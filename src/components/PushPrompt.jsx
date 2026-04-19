import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../context/AuthContext'
import { isPushSupported, subscribeUser } from '../lib/push'

const STORAGE_KEY = 'push_prompted'

export default function PushPrompt() {
  const { user } = useAuth()
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    if (!user) return
    if (!isPushSupported()) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem(STORAGE_KEY) === '1') return
    if (!['/chats', '/friends'].some(p => location.pathname.startsWith(p))) return
    setVisible(true)
  }, [user, location.pathname])

  async function enable() {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        await subscribeUser(user.id)
      }
    } catch (e) {}
    localStorage.setItem(STORAGE_KEY, '1')
    setBusy(false)
    setVisible(false)
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-gradient-to-r from-violet-50 to-pink-50 border-b border-violet-100 px-4 py-3 flex items-center gap-3">
      <div className="text-2xl">🔔</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">Включить уведомления?</div>
        <div className="text-xs text-gray-500">Чтобы не пропустить сообщения и заявки</div>
      </div>
      <button
        onClick={dismiss}
        disabled={busy}
        className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-white/60 disabled:opacity-50"
      >
        Не сейчас
      </button>
      <button
        onClick={enable}
        disabled={busy}
        className="text-xs font-medium bg-gradient-to-r from-violet-500 to-pink-500 text-white px-4 py-1.5 rounded-lg disabled:opacity-50"
      >
        Включить
      </button>
    </div>
  )
}

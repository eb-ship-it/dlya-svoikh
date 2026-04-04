import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MayachokIcon from './MayachokIcon'

export default function MayachokSetup({ onClose, onSaved }) {
  const { user } = useAuth()
  const [goals, setGoals] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!goals.trim()) return
    setSaving(true)
    await supabase.from('mayachok_settings').upsert({
      user_id: user.id,
      enabled: true,
      goals: goals.trim(),
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="mb-3 flex justify-center">
            <MayachokIcon size={48} />
          </div>
          <h2 className="font-bold text-gray-800 text-lg">Привет! Я Маячок</h2>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Расскажи мне о своих целях, и я каждый день буду писать тебе что-то полезное
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Мои цели</label>
          <textarea
            value={goals}
            onChange={e => setGoals(e.target.value)}
            placeholder="Например: хочу начать бегать, читать по 30 минут в день, выучить новый язык..."
            rows={3}
            maxLength={500}
            className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!goals.trim() || saving}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
        >
          {saving ? '...' : 'Запустить Маячок'}
        </button>
        <button
          onClick={onClose}
          className="w-full text-gray-400 text-sm mt-2 py-2"
        >
          Не сейчас
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import QuestionCard from '../components/QuestionCard'
import { useTodayQuestion } from '../hooks/useTodayQuestion'
import { computeStreak } from '../hooks/useStreak'

export default function RitualSoloPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { question, loading: qLoading } = useTodayQuestion()

  const [todayAnswer, setTodayAnswer] = useState(null)
  const [archive, setArchive] = useState([])
  const [streak, setStreak] = useState(0)
  const [frozen, setFrozen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: ans, error: e } = await supabase
        .from('ritual_solo_answers')
        .select('id, question_id, content, created_at, ritual_questions(id, text)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (e) throw e

      const items = ans || []
      const today = items.find(a => a.question_id === question?.id)
      setTodayAnswer(today || null)
      setArchive(items.filter(a => a.id !== today?.id))

      // Streak: pull pick dates for answered questions
      const qIds = items.map(a => a.question_id)
      if (qIds.length) {
        const { data: picks } = await supabase
          .from('ritual_daily_picks')
          .select('pick_date, question_id')
          .in('question_id', qIds)
        const dates = (picks || []).map(p => p.pick_date)
        const { streak: s, frozen: f } = computeStreak(dates)
        setStreak(s)
        setFrozen(f)
      } else {
        setStreak(0)
        setFrozen(false)
      }

      setError('')
      setLoading(false)
    } catch (err) {
      console.error('RitualSolo load error:', err)
      setError('Не удалось загрузить дневник')
      setLoading(false)
    }
  }, [user, question?.id])

  useEffect(() => {
    if (qLoading) return
    load()
  }, [qLoading, load])

  async function submit() {
    if (!draft.trim() || submitting || !question?.id) return
    setSubmitting(true)
    try {
      const { error: e } = await supabase
        .from('ritual_solo_answers')
        .insert({
          user_id: user.id,
          question_id: question.id,
          content: draft.trim(),
        })
      if (e) throw e
      setDraft('')
      setShowInput(false)
      await load()
    } catch (err) {
      console.error('soloAnswer error:', err)
      setError('Не получилось отправить ответ')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || qLoading) {
    return <Wrap onBack={() => navigate('/rituals')}><div className="text-center text-gray-400 py-10 text-sm">Загрузка…</div></Wrap>
  }

  if (showInput && question) {
    return (
      <Wrap onBack={() => setShowInput(false)} title="Соло-ответ" cancel>
        <QuestionCard variant="light" label="вопрос дня" text={question.text} />
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Это видишь только ты"
          className="w-full mt-3 p-3 rounded-2xl border border-gray-200 focus:border-violet-500 focus:outline-none text-sm text-gray-800 resize-none"
        />
        <div className="text-right text-xs text-gray-400 mt-2">{draft.length} / 2000</div>
        <button
          onClick={submit}
          disabled={!draft.trim() || submitting}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl mt-3 disabled:opacity-50"
        >
          {submitting ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </Wrap>
    )
  }

  return (
    <Wrap onBack={() => navigate('/rituals')}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-[30%] rounded-full bg-white/85" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold text-gray-900">Только для себя</div>
          <div className="text-xs text-gray-500">
            Личный дневник в вопросах
            {streak > 0 && <> · {streak} {frozen ? '❄️' : '🔥'}</>}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm p-3 rounded-xl mb-4">{error}</div>
      )}

      {question && !todayAnswer && (
        <>
          <QuestionCard variant="hero" label="сегодня" text={question.text} />
          <button
            onClick={() => setShowInput(true)}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl mt-4"
          >
            Ответить
          </button>
        </>
      )}

      {todayAnswer && (
        <>
          <QuestionCard variant="light" label="сегодня" text={question?.text || todayAnswer.ritual_questions?.text} />
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mt-3">
            <div className="text-xs text-gray-400 mb-2">{formatDate(todayAnswer.created_at)}</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {todayAnswer.content}
            </div>
          </div>
        </>
      )}

      {archive.length > 0 && (
        <>
          <div className="text-sm font-semibold text-gray-700 mt-6 mb-2">Раньше</div>
          <div className="space-y-2">
            {archive.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-3 border-l-4 border-violet-500">
                <div className="text-[10px] text-gray-400 mb-1">{formatDate(a.created_at)}</div>
                {a.ritual_questions?.text && (
                  <div className="text-xs italic text-gray-500 mb-1.5">«{a.ritual_questions.text}»</div>
                )}
                <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{a.content}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {!todayAnswer && !archive.length && question && (
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          Тут будет твой архив. Можно отвечать каждый день — а можно через раз.
        </p>
      )}
    </Wrap>
  )
}

function Wrap({ children, onBack, title, cancel }) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        {(onBack || title) && (
          <div className="flex items-center mb-4">
            {onBack && (
              <button onClick={onBack} className="text-gray-500 text-sm">
                {cancel ? 'отмена' : '← назад'}
              </button>
            )}
            {title && <div className="flex-1 text-center font-semibold text-gray-700 text-sm">{title}</div>}
            <div className="w-12" />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return 'сегодня · ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

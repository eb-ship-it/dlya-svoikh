import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import QuestionCard from '../components/QuestionCard'
import RitualRevealCelebration from '../components/RitualRevealCelebration'
import { useTodayQuestion } from '../hooks/useTodayQuestion'
import { computeStreak } from '../hooks/useStreak'

export default function RitualPairPage() {
  const { pairId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { question, loading: qLoading } = useTodayQuestion()

  const [pair, setPair] = useState(null)
  const [other, setOther] = useState(null)
  const [myAnswer, setMyAnswer] = useState(null)
  const [partnerAnswer, setPartnerAnswer] = useState(null)
  const [streak, setStreak] = useState(0)
  const [frozen, setFrozen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [showAnswerInput, setShowAnswerInput] = useState(false)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const load = useCallback(async () => {
    if (!user || !pairId) return
    try {
      const { data: pairData, error: e1 } = await supabase
        .from('ritual_pairs')
        .select('id, status, deck, depth, created_by_id, user_a_id, user_b_id, accepted_at')
        .eq('id', pairId)
        .single()
      if (e1) throw e1

      const otherId = pairData.user_a_id === user.id ? pairData.user_b_id : pairData.user_a_id
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('id', otherId)
        .single()

      setPair(pairData)
      setOther(otherProfile)

      // Today's answers (only if active and we have today's question)
      if (pairData.status === 'active' && question?.id) {
        const { data: ans } = await supabase
          .from('ritual_answers')
          .select('id, user_id, content, created_at')
          .eq('pair_id', pairId)
          .eq('question_id', question.id)

        const mine = (ans || []).find(a => a.user_id === user.id)
        const theirs = (ans || []).find(a => a.user_id === otherId)
        setMyAnswer(mine || null)
        setPartnerAnswer(theirs || null)
      } else {
        setMyAnswer(null)
        setPartnerAnswer(null)
      }

      // Streak: revealed dates in last 60 days
      if (pairData.status === 'active') {
        const windowStart = new Date()
        windowStart.setDate(windowStart.getDate() - 60)

        const { data: allAns } = await supabase
          .from('ritual_answers')
          .select('user_id, question_id')
          .eq('pair_id', pairId)
          .gte('created_at', windowStart.toISOString())

        const myQs = new Set((allAns || []).filter(a => a.user_id === user.id).map(a => a.question_id))
        const theirQs = new Set((allAns || []).filter(a => a.user_id === otherId).map(a => a.question_id))
        const sharedQ = [...myQs].filter(q => theirQs.has(q))

        if (sharedQ.length) {
          const { data: picks } = await supabase
            .from('ritual_daily_picks')
            .select('pick_date, question_id')
            .in('question_id', sharedQ)
          const dates = (picks || []).map(p => p.pick_date)
          const { streak: s, frozen: f } = computeStreak(dates)
          setStreak(s)
          setFrozen(f)
        } else {
          setStreak(0)
          setFrozen(false)
        }
      }

      setError('')
      setLoading(false)
    } catch (err) {
      console.error('RitualPairPage load error:', err)
      setError('Не удалось загрузить пару')
      setLoading(false)
    }
  }, [user, pairId, question?.id])

  useEffect(() => {
    if (qLoading) return
    load()
  }, [qLoading, load])

  // Realtime: refresh on changes to this pair's answers/state
  useEffect(() => {
    if (!user || !pairId) return
    const channel = supabase
      .channel(`pair:${pairId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ritual_answers', filter: `pair_id=eq.${pairId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ritual_pairs', filter: `id=eq.${pairId}` }, load)
      .subscribe()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 10_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [user, pairId, load])

  async function submitAnswer() {
    if (!draft.trim() || submitting || !question?.id) return
    setSubmitting(true)
    setActionError('')
    try {
      const { error: e } = await supabase
        .from('ritual_answers')
        .insert({
          pair_id: pairId,
          user_id: user.id,
          question_id: question.id,
          content: draft.trim(),
        })
      // 23505 = unique violation. Means an earlier submit actually succeeded
      // (likely a stale UI race). Treat as success: refresh and show what's saved.
      if (e && e.code !== '23505') throw e
      setDraft('')
      setShowAnswerInput(false)
      await load()
    } catch (err) {
      console.error('submitAnswer error:', err)
      setActionError(formatPgError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function acceptPair() {
    if (accepting) return
    setAccepting(true)
    setActionError('')
    try {
      const { error: e } = await supabase
        .from('ritual_pairs')
        .update({ status: 'active', accepted_at: new Date().toISOString() })
        .eq('id', pairId)
      if (e) throw e
      await load()
    } catch (err) {
      console.error('acceptPair error:', err)
      setActionError(formatPgError(err))
    } finally {
      setAccepting(false)
    }
  }

  async function declinePair() {
    if (accepting) return
    setAccepting(true)
    try {
      await supabase.from('ritual_pairs').update({ status: 'declined' }).eq('id', pairId)
      navigate('/rituals')
    } catch (err) {
      console.error('declinePair error:', err)
    } finally {
      setAccepting(false)
    }
  }

  async function cancelPair() {
    if (!window.confirm('Отменить приглашение?')) return
    try {
      await supabase.from('ritual_pairs').delete().eq('id', pairId)
      navigate('/rituals')
    } catch (err) {
      console.error('cancelPair error:', err)
    }
  }

  if (loading || qLoading) {
    return <Wrap><div className="text-center text-gray-400 py-10 text-sm">Загрузка…</div></Wrap>
  }

  if (!pair) {
    return (
      <Wrap>
        <div className="bg-white rounded-2xl p-6 text-center">
          <p className="text-gray-700 mb-3">{error || 'Пара не найдена'}</p>
          <button onClick={() => navigate('/rituals')} className="text-violet-600 font-semibold">
            ← к ритуалам
          </button>
        </div>
      </Wrap>
    )
  }

  const otherName = other?.display_name || other?.username || '...'

  // Pending — receiver
  if (pair.status === 'pending' && pair.created_by_id !== user.id) {
    return (
      <Wrap onBack={() => navigate('/rituals')}>
        <PairHeader other={other} subline={`${otherName} приглашает в ритуал`} />
        <ErrorBanner text={actionError} />
        <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-4 mb-4 text-sm text-gray-700 leading-relaxed">
          Если принять, вам обоим будет приходить один вопрос в день. Ответы открываются, когда ответите оба.
        </div>
        <button
          onClick={acceptPair}
          disabled={accepting}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
        >
          {accepting ? 'Принимаем…' : 'Принять приглашение'}
        </button>
        <button
          onClick={declinePair}
          disabled={accepting}
          className="w-full bg-white text-gray-500 font-medium py-3 rounded-xl mt-2 border border-gray-200 disabled:opacity-50"
        >
          Отклонить
        </button>
      </Wrap>
    )
  }

  // Pending — sender
  if (pair.status === 'pending' && pair.created_by_id === user.id) {
    return (
      <Wrap onBack={() => navigate('/rituals')}>
        <PairHeader other={other} subline="Ждём принятия приглашения" dim />
        <div className="bg-gray-100 border border-dashed border-gray-300 rounded-2xl p-5 text-center text-sm text-gray-500 mb-4">
          {question ? `Первый вопрос:` : 'Первый вопрос будет, когда примут.'}
          {question && (
            <div className="text-base text-gray-600 mt-2 font-medium">{question.text}</div>
          )}
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-4 mb-4 text-sm text-gray-700 leading-relaxed">
          {otherName} ещё не принял приглашение. Когда примет — вы оба сможете отвечать.
        </div>
        <button
          onClick={cancelPair}
          className="w-full bg-white text-gray-500 font-medium py-3 rounded-xl border border-gray-200"
        >
          Отменить приглашение
        </button>
      </Wrap>
    )
  }

  if (pair.status === 'declined') {
    return (
      <Wrap onBack={() => navigate('/rituals')}>
        <PairHeader other={other} subline="Приглашение отклонено" dim />
      </Wrap>
    )
  }

  // Active — answering input
  if (showAnswerInput && question) {
    return (
      <Wrap onBack={() => setShowAnswerInput(false)} title={`Ответить ${otherName}`} cancel>
        <QuestionCard variant="light" label="вопрос дня" text={question.text} />
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder={`Пиши свободно — ${otherName} увидит твой ответ только после своего`}
          className="w-full mt-3 p-3 rounded-2xl border border-gray-200 focus:border-violet-500 focus:outline-none text-sm text-gray-800 resize-none"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>🔒 Скрыто, пока оба не ответят</span>
          <span>{draft.length} / 2000</span>
        </div>
        <ErrorBanner text={actionError} />
        <button
          onClick={submitAnswer}
          disabled={!draft.trim() || submitting}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl mt-4 disabled:opacity-50"
        >
          {submitting ? 'Отправляем…' : 'Отправить'}
        </button>
      </Wrap>
    )
  }

  // Active — main view
  const bothAnswered = myAnswer && partnerAnswer
  const onlyPartner = !myAnswer && partnerAnswer
  const onlyMine = myAnswer && !partnerAnswer
  const neither = !myAnswer && !partnerAnswer

  if (bothAnswered) {
    return (
      <Wrap onBack={() => navigate('/rituals')}>
        <RitualRevealCelebration
          question={question}
          myAnswer={myAnswer}
          partnerAnswer={partnerAnswer}
          myUsername={profile?.username}
          partnerProfile={other}
          streak={streak}
          frozen={frozen}
        />
      </Wrap>
    )
  }

  return (
    <Wrap onBack={() => navigate('/rituals')}>
      <PairHeader
        other={other}
        subline={
          onlyPartner
            ? `${otherName} уже ответил${(other?.username || '').endsWith('a') ? 'а' : ''} 🤍`
            : onlyMine
            ? `Ждём ответ от ${otherName}`
            : `${streak > 0 ? `${streak} дней подряд ${frozen ? '❄️' : '🔥'}` : 'Колода: ' + pair.deck}`
        }
        emphasized={onlyPartner}
      />

      {question && (
        onlyMine
          ? <QuestionCard variant="light" label="вопрос дня" text={question.text} />
          : <QuestionCard variant="hero" label="вопрос дня" text={question.text} />
      )}

      {onlyMine && myAnswer && (
        <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-3 mt-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 mb-1">
            <Avatar username={profile?.username} size="xs" /> Твой ответ
          </div>
          <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{myAnswer.content}</div>
        </div>
      )}

      <div className={`mt-4 rounded-2xl p-4 text-center text-sm ${
        onlyPartner
          ? 'bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-300 text-violet-700'
          : 'bg-gray-100 border border-dashed border-gray-300 text-gray-500'
      }`}>
        {onlyPartner && (
          <>
            💌 Ответ {otherName} готов<br />
            <span className="text-xs text-gray-500">Откроется, когда ответишь и ты</span>
          </>
        )}
        {onlyMine && (
          <>
            ⏳ Ответ {otherName} появится здесь<br />
            <span className="text-xs">когда {otherName} ответит на вопрос</span>
          </>
        )}
        {neither && (
          <>
            🤍 Никто ещё не ответил.<br />
            <span className="text-xs">Ответы откроются, когда ответите оба.</span>
          </>
        )}
      </div>

      {!myAnswer && (
        <button
          onClick={() => setShowAnswerInput(true)}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl mt-4"
        >
          {onlyPartner ? 'Ответить, чтобы открыть' : 'Ответить'}
        </button>
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

function PairHeader({ other, subline, emphasized, dim }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Avatar username={other?.username} size="md" className={dim ? 'opacity-50' : ''} />
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold text-gray-900 truncate">
          {other?.display_name || other?.username || '...'}
        </div>
        <div className={`text-xs truncate ${emphasized ? 'text-violet-600 font-semibold' : 'text-gray-500'}`}>
          {subline}
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ text }) {
  if (!text) return null
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl mb-3 whitespace-pre-wrap break-words">
      {text}
    </div>
  )
}

function formatPgError(err) {
  if (!err) return 'Неизвестная ошибка'
  const parts = []
  if (err.message) parts.push(err.message)
  if (err.code) parts.push(`код: ${err.code}`)
  if (err.details) parts.push(err.details)
  if (err.hint) parts.push(`подсказка: ${err.hint}`)
  return parts.join(' · ') || String(err)
}

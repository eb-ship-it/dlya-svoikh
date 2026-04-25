import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTodayQuestion() {
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    load()
    return () => { cancelled = true }

    async function load() {
      try {
        setLoading(true)
        const { data: questionId, error: rpcErr } = await supabase.rpc('pick_daily_question')
        if (rpcErr) throw rpcErr
        if (!questionId) throw new Error('Нет вопроса на сегодня')

        const { data: q, error: qErr } = await supabase
          .from('ritual_questions')
          .select('id, text, deck')
          .eq('id', questionId)
          .single()
        if (qErr) throw qErr

        if (!cancelled) {
          setQuestion(q)
          setError('')
        }
      } catch (err) {
        console.error('useTodayQuestion error:', err)
        if (!cancelled) setError('Не удалось загрузить вопрос')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
  }, [])

  return { question, loading, error }
}

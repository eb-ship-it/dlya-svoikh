import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { computeStreak } from './useStreak'

const POLL_MS = 10_000

export function useRitualPairs(userId) {
  const [pairs, setPairs] = useState([])
  const [todayQuestionId, setTodayQuestionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    load()

    const channel = supabase
      .channel(`ritual_hub:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ritual_pairs' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ritual_answers' }, () => load())
      .subscribe()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      clearInterval(interval)
    }

    async function load() {
      try {
        const { data: rawPairs, error: pairsErr } = await supabase
          .from('ritual_pairs')
          .select('id, status, deck, depth, created_by_id, user_a_id, user_b_id, created_at, accepted_at')
          .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
          .order('created_at', { ascending: false })
        if (pairsErr) throw pairsErr

        if (!rawPairs?.length) {
          if (!cancelled) {
            setPairs([])
            setLoading(false)
          }
          return
        }

        // Other user profiles
        const otherIds = [...new Set(rawPairs.map(p => p.user_a_id === userId ? p.user_b_id : p.user_a_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .in('id', otherIds)
        const profileMap = new Map((profiles || []).map(p => [p.id, p]))

        // Today's question
        const today = new Date().toISOString().slice(0, 10)
        const { data: pick } = await supabase
          .from('ritual_daily_picks')
          .select('question_id')
          .eq('pick_date', today)
          .maybeSingle()
        const todayQId = pick?.question_id || null

        // 60-day window for streak + today status
        const windowStart = new Date()
        windowStart.setDate(windowStart.getDate() - 60)

        const activePairIds = rawPairs.filter(p => p.status === 'active').map(p => p.id)
        let answers = []
        if (activePairIds.length) {
          const { data: ans } = await supabase
            .from('ritual_answers')
            .select('pair_id, user_id, question_id, created_at')
            .in('pair_id', activePairIds)
            .gte('created_at', windowStart.toISOString())
          answers = ans || []
        }

        // Daily picks in same window — for streak date mapping
        const { data: picksWindow } = await supabase
          .from('ritual_daily_picks')
          .select('pick_date, question_id')
          .gte('pick_date', windowStart.toISOString().slice(0, 10))
        const questionDateMap = new Map((picksWindow || []).map(p => [p.question_id, p.pick_date]))

        // Build enriched pairs
        const enriched = rawPairs.map(p => {
          const otherId = p.user_a_id === userId ? p.user_b_id : p.user_a_id
          const other = profileMap.get(otherId)

          const myToday = todayQId
            ? answers.some(a => a.pair_id === p.id && a.user_id === userId && a.question_id === todayQId)
            : false
          const partnerToday = todayQId
            ? answers.some(a => a.pair_id === p.id && a.user_id === otherId && a.question_id === todayQId)
            : false

          let listStatus = 'idle'
          if (p.status === 'pending') {
            listStatus = p.created_by_id === userId ? 'pending-mine' : 'pending-accept'
          } else if (p.status === 'active') {
            if (myToday && partnerToday) listStatus = 'revealed'
            else if (partnerToday && !myToday) listStatus = 'partner-answered'
            else if (!myToday) listStatus = 'waiting-mine'
            else listStatus = 'waiting-partner'
          } else {
            listStatus = p.status // paused | declined
          }

          // Streak: dates where both answered the daily question
          const myQs = new Set(answers.filter(a => a.pair_id === p.id && a.user_id === userId).map(a => a.question_id))
          const theirQs = new Set(answers.filter(a => a.pair_id === p.id && a.user_id === otherId).map(a => a.question_id))
          const revealedDates = []
          for (const q of myQs) {
            if (theirQs.has(q) && questionDateMap.has(q)) {
              revealedDates.push(questionDateMap.get(q))
            }
          }
          const { streak, frozen } = computeStreak(revealedDates)

          return {
            ...p,
            other,
            otherId,
            myToday,
            partnerToday,
            listStatus,
            streak,
            frozen,
          }
        })

        // Sort: pending-accept → waiting-mine/partner-answered → revealed → others
        const order = {
          'pending-accept': 0,
          'waiting-mine': 1,
          'partner-answered': 1,
          'revealed': 2,
          'waiting-partner': 3,
          'pending-mine': 4,
          'paused': 5,
          'declined': 6,
          'idle': 3,
        }
        enriched.sort((a, b) => (order[a.listStatus] ?? 9) - (order[b.listStatus] ?? 9))

        if (!cancelled) {
          setPairs(enriched)
          setTodayQuestionId(todayQId)
          setError('')
          setLoading(false)
        }
      } catch (err) {
        console.error('useRitualPairs error:', err)
        if (!cancelled) {
          setError('Не удалось загрузить ритуалы')
          setLoading(false)
        }
      }
    }
  }, [userId])

  return { pairs, todayQuestionId, loading, error }
}

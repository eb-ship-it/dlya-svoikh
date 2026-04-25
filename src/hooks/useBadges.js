import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const POLL_INTERVAL_MS = 10_000

export function useBadges(userId) {
  const [unreadChats, setUnreadChats] = useState(0)
  const [pendingFriends, setPendingFriends] = useState(0)
  const [newPosts, setNewPosts] = useState(false)
  const [ritualsWaiting, setRitualsWaiting] = useState(0)

  useEffect(() => {
    if (!userId) return

    checkAll()

    const channel = supabase
      .channel('badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => checkUnreadChats())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => checkUnreadChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => checkPendingFriends())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => checkNewPosts())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, () => checkNewPosts())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mayachok_posts', filter: `user_id=eq.${userId}` }, () => checkNewPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ritual_pairs' }, () => checkRitualsWaiting())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ritual_answers' }, () => checkRitualsWaiting())
      .subscribe()

    // Polling fallback for mobile browsers where realtime is unreliable
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') checkAll()
    }, POLL_INTERVAL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [userId])

  function checkAll() {
    checkUnreadChats()
    checkPendingFriends()
    checkNewPosts()
    checkRitualsWaiting()
  }

  async function checkUnreadChats() {
    try {
      const { data: myChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId)

      if (!myChats?.length) { setUnreadChats(0); return }

      const chatIds = myChats.map(c => c.chat_id)
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('chat_id', chatIds)
        .neq('sender_id', userId)
        .is('read_at', null)

      setUnreadChats(count || 0)
    } catch (err) {
      console.error('checkUnreadChats error:', err)
    }
  }

  async function checkPendingFriends() {
    try {
      const { count } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', userId)
        .eq('status', 'pending')

      setPendingFriends(count || 0)
    } catch (err) {
      console.error('checkPendingFriends error:', err)
    }
  }

  async function checkNewPosts() {
    try {
      const { data: lastSeen } = await supabase
        .from('feed_last_seen')
        .select('seen_at')
        .eq('user_id', userId)
        .single()

      if (!lastSeen) {
        await supabase.from('feed_last_seen').insert({ user_id: userId })
        setNewPosts(false)
        return
      }

      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted')

      const friendIds = (friendships || []).map(f =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      )

      // New Mayachok posts (personal, don't require friends)
      const { count: newMayachokCount } = await supabase
        .from('mayachok_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gt('created_at', lastSeen.seen_at)

      let newPostCount = 0
      let newCommentCount = 0

      if (friendIds.length) {
        const { count: pc } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .in('user_id', friendIds)
          .gt('created_at', lastSeen.seen_at)
        newPostCount = pc || 0

        // Count comments only on posts visible in the user's feed (own + friends')
        const visibleUserIds = [...friendIds, userId]
        const { data: visiblePosts } = await supabase
          .from('posts')
          .select('id')
          .in('user_id', visibleUserIds)

        const visiblePostIds = (visiblePosts || []).map(p => p.id)

        if (visiblePostIds.length) {
          const { count } = await supabase
            .from('post_comments')
            .select('id', { count: 'exact', head: true })
            .in('post_id', visiblePostIds)
            .neq('user_id', userId)
            .gt('created_at', lastSeen.seen_at)
          newCommentCount = count || 0
        }
      }

      setNewPosts((newMayachokCount || 0) + newPostCount + newCommentCount > 0)
    } catch (err) {
      console.error('checkNewPosts error:', err)
    }
  }

  async function checkRitualsWaiting() {
    try {
      const { data: pairs } = await supabase
        .from('ritual_pairs')
        .select('id, status, created_by_id, user_a_id, user_b_id')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

      if (!pairs?.length) { setRitualsWaiting(0); return }

      let waiting = 0
      const pendingForMe = pairs.filter(p => p.status === 'pending' && p.created_by_id !== userId)
      waiting += pendingForMe.length

      const activePairs = pairs.filter(p => p.status === 'active')
      if (activePairs.length) {
        const today = new Date().toISOString().slice(0, 10)
        const { data: pick } = await supabase
          .from('ritual_daily_picks')
          .select('question_id')
          .eq('pick_date', today)
          .maybeSingle()

        if (pick?.question_id) {
          const activeIds = activePairs.map(p => p.id)
          const { data: myAnswers } = await supabase
            .from('ritual_answers')
            .select('pair_id')
            .eq('user_id', userId)
            .eq('question_id', pick.question_id)
            .in('pair_id', activeIds)

          const answeredSet = new Set((myAnswers || []).map(a => a.pair_id))
          waiting += activePairs.length - answeredSet.size
        }
      }

      setRitualsWaiting(waiting)
    } catch (err) {
      console.error('checkRitualsWaiting error:', err)
    }
  }

  async function markFeedSeen() {
    try {
      await supabase
        .from('feed_last_seen')
        .upsert({ user_id: userId, seen_at: new Date().toISOString() })
      setNewPosts(false)
    } catch (err) {
      console.error('markFeedSeen error:', err)
    }
  }

  return { unreadChats, pendingFriends, newPosts, ritualsWaiting, markFeedSeen, checkAll }
}

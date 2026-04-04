import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBadges(userId) {
  const [unreadChats, setUnreadChats] = useState(0)
  const [pendingFriends, setPendingFriends] = useState(0)
  const [newPosts, setNewPosts] = useState(false)

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
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  function checkAll() {
    checkUnreadChats()
    checkPendingFriends()
    checkNewPosts()
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

      if (!friendIds.length) { setNewPosts(false); return }

      const { count: newPostCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .in('user_id', friendIds)
        .gt('created_at', lastSeen.seen_at)

      const { count: newCommentCount } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .neq('user_id', userId)
        .gt('created_at', lastSeen.seen_at)

      setNewPosts((newPostCount || 0) + (newCommentCount || 0) > 0)
    } catch (err) {
      console.error('checkNewPosts error:', err)
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

  return { unreadChats, pendingFriends, newPosts, markFeedSeen, checkAll }
}

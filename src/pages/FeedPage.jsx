import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { avatarGradient } from '../lib/colors'
import UserPopup from '../components/UserPopup'
import MayachokCard from '../components/MayachokCard'

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [mayachokPosts, setMayachokPosts] = useState([])
  const visibleIdsRef = useRef(new Set())

  useEffect(() => {
    if (!user) return
    loadFeed()

    const channel = supabase
      .channel(`feed:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
      }, async payload => {
        if (!visibleIdsRef.current.has(payload.new.user_id)) return
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(username, display_name)')
          .eq('id', payload.new.id)
          .maybeSingle()
        if (data) setPosts(prev => prev.some(p => p.id === data.id) ? prev : [data, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  async function loadFeed() {
    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      const friendIds = (friendships || []).map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
      const visibleIds = [...friendIds, user.id]
      visibleIdsRef.current = new Set(visibleIds)

      const { data, error: e } = await supabase
        .from('posts')
        .select('*, profiles(username, display_name)')
        .in('user_id', visibleIds)
        .order('created_at', { ascending: false })
        .limit(50)

      if (e) throw e
      setPosts(data || [])
      setError('')

      // Load today's Mayachok posts
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: mPosts } = await supabase
        .from('mayachok_posts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
      setMayachokPosts(mPosts || [])
    } catch (err) {
      console.error('loadFeed error:', err)
      setError('Не удалось загрузить ленту')
    } finally {
      setLoading(false)
    }
  }

  async function submitPost(e) {
    e.preventDefault()
    if (!text.trim() || posting) return
    setPosting(true)
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: text.trim(),
      })
      if (error) throw error
      setText('')
      loadFeed()
    } catch (err) {
      console.error('submitPost error:', err)
    } finally {
      setPosting(false)
    }
  }

  async function deletePost(postId) {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setDeleteConfirm(null)
  }

  function formatDate(ts) {
    const MINUTE = 60_000
    const HOUR = 3_600_000
    const DAY = 86_400_000
    const date = new Date(ts)
    const diff = Date.now() - date
    if (diff < MINUTE) return 'только что'
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)} мин назад`
    if (diff < DAY) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-4">

        {/* Post composer */}
        <form onSubmit={submitPost} className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex gap-3">
            <div className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(profile?.username)} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 text-sm`}>
              {profile?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Что новенького?.."
                rows={2}
                maxLength={2000}
                className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!text.trim() || posting}
              className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-full transition-all"
            >
              {posting ? '...' : 'Поделиться'}
            </button>
          </div>
        </form>

        {/* Feed: posts + mayachok merged by created_at */}
        {loading ? (
          <div className="text-center text-gray-400 py-8 text-sm">Загрузка...</div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={() => { setLoading(true); setError(''); loadFeed() }} className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm px-4 py-2 rounded-xl">Повторить</button>
          </div>
        ) : posts.length === 0 && mayachokPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/10 to-pink-500/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📰</span>
            </div>
            <p className="font-medium text-gray-500">Лента пуста</p>
            <p className="text-xs text-gray-400 mt-1">Здесь будут новости твоих друзей</p>
          </div>
        ) : (
          [
            ...posts.map(p => ({ ...p, _kind: 'post' })),
            ...mayachokPosts.map(m => ({ ...m, _kind: 'mayachok' })),
          ]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(post => post._kind === 'mayachok' ? (
              <MayachokCard key={`m-${post.id}`} post={post} />
            ) : (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setSelectedUser({ id: post.user_id, username: post.profiles?.username, displayName: post.profiles?.display_name })}
                  className={`w-9 h-9 bg-gradient-to-br ${avatarGradient(post.profiles?.username)} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0 text-sm`}
                >
                  {post.profiles?.username?.[0]?.toUpperCase() || '?'}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedUser({ id: post.user_id, username: post.profiles?.username, displayName: post.profiles?.display_name })}
                      className="font-medium text-gray-800 text-sm hover:text-violet-500 transition-colors text-left"
                    >
                      {post.profiles?.display_name || post.profiles?.username}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                      {post.user_id === user.id && (
                        <button
                          onClick={() => setDeleteConfirm(post.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          title="Удалить"
                          aria-label="Удалить пост"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mt-1 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <PostReactions postId={post.id} userId={user.id} />
                  <PostComments postId={post.id} userId={user.id} username={profile?.username} onUserClick={setSelectedUser} />
                </div>
              </div>
            </div>
            ))
        )}
      </div>

      {/* Модалка подтверждения удаления */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-gray-800 font-medium text-center mb-1">Удалить пост?</p>
            <p className="text-gray-400 text-sm text-center mb-5">Это действие нельзя отменить</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => deletePost(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <UserPopup
          userId={selectedUser.id}
          username={selectedUser.username}
          displayName={selectedUser.displayName}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  )
}

/* ===================== Реакции ===================== */
const REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👍']

function PostReactions({ postId, userId }) {
  const [reactions, setReactions] = useState([])
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => { loadReactions() }, [postId])

  async function loadReactions() {
    const { data } = await supabase
      .from('post_reactions')
      .select('emoji, user_id')
      .eq('post_id', postId)
    setReactions(data || [])
  }

  async function toggle(emoji) {
    const myReaction = reactions.find(r => r.user_id === userId && r.emoji === emoji)
    if (myReaction) {
      await supabase.from('post_reactions').delete()
        .eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji)
    } else {
      await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, emoji })
    }
    setShowPicker(false)
    loadReactions()
  }

  // Group by emoji
  const counts = {}
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1
  }
  const myReactions = new Set(reactions.filter(r => r.user_id === userId).map(r => r.emoji))
  const activeEmojis = REACTIONS.filter(e => counts[e] > 0)

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {activeEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
            myReactions.has(emoji) ? 'bg-purple-50 border border-purple-300' : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
          }`}
        >
          <span>{emoji}</span>
          <span className={myReactions.has(emoji) ? 'text-purple-600' : 'text-gray-500'}>{counts[emoji]}</span>
        </button>
      ))}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-400 text-sm"
      >
        +
      </button>
      {showPicker && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 bottom-24 bg-white rounded-2xl shadow-lg border border-gray-100 p-2 flex gap-1.5 z-20">
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => toggle(emoji)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-lg ${myReactions.has(emoji) ? 'bg-purple-50' : ''}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ===================== Комментарии ===================== */
function PostComments({ postId, userId, username, onUserClick }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => { loadCount() }, [postId])

  async function loadCount() {
    const { count: c } = await supabase
      .from('post_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
    setCount(c || 0)
  }

  async function loadComments() {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles(username, display_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setCount(data?.length || 0)
  }

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: userId,
      content: text.trim(),
    })
    setText('')
    loadComments()
  }

  function toggleOpen() {
    if (!open) loadComments()
    setOpen(!open)
  }

  function formatTime(ts) {
    const MINUTE = 60_000
    const HOUR = 3_600_000
    const DAY = 86_400_000
    const date = new Date(ts)
    const diff = Date.now() - date
    if (diff < MINUTE) return 'сейчас'
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)} мин`
    if (diff < DAY) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="mt-2">
      <button onClick={toggleOpen} className="text-xs text-gray-400 hover:text-gray-600">
        {count > 0 ? `Комментарии (${count})` : 'Комментировать'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <button
                onClick={() => onUserClick?.({ id: c.user_id, username: c.profiles?.username, displayName: c.profiles?.display_name })}
                className={`w-6 h-6 bg-gradient-to-br ${avatarGradient(c.profiles?.username)} rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0`}
              >
                {c.profiles?.username?.[0]?.toUpperCase()}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <button
                    onClick={() => onUserClick?.({ id: c.user_id, username: c.profiles?.username, displayName: c.profiles?.display_name })}
                    className="text-xs font-medium text-gray-700 hover:text-violet-500 transition-colors"
                  >
                    {c.profiles?.display_name || c.profiles?.username}
                  </button>
                  <span className="text-[10px] text-gray-300">{formatTime(c.created_at)}</span>
                </div>
                <p className="text-xs text-gray-600">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submit} className="flex gap-1.5 items-center">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Комментарий..."
              maxLength={1000}
              className="flex-1 min-w-0 bg-gray-50 rounded-full px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-200"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="text-violet-500 disabled:text-violet-300 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

const DECKS = [
  { id: 'parents', emoji: '🌿', name: 'Родители / дети', desc: 'О детстве, истории семьи, мечтах разных лет' },
  { id: 'partners', emoji: '💞', name: 'Партнёры', desc: 'Близость, планы, чувства, маленькие договорённости' },
  { id: 'friends', emoji: '🤝', name: 'Друзья', desc: 'Воспоминания, идеи, лёгкое и глубокое' },
  { id: 'family', emoji: '🌸', name: 'Семья', desc: 'Братья, сёстры, бабушки — общие истории' },
  { id: 'light', emoji: '✨', name: 'Лёгкие вопросы', desc: 'Если хочется без серьёзностей' },
]

const DEPTHS = [
  { id: 'light', label: 'Лёгкие' },
  { id: 'medium', label: 'Средние' },
  { id: 'deep', label: 'Глубокие' },
  { id: 'mix', label: 'Микс' },
]

export default function CreateRitualPairPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [friends, setFriends] = useState([])
  const [pairedFriendIds, setPairedFriendIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [selectedDeck, setSelectedDeck] = useState('light')
  const [selectedDepth, setSelectedDepth] = useState('medium')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    loadFriends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function loadFriends() {
    try {
      const { data: fs } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      const friendIds = (fs || []).map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )

      if (!friendIds.length) {
        setFriends([])
        setLoading(false)
        return
      }

      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .in('id', friendIds)

      setFriends(profs || [])

      const { data: existing } = await supabase
        .from('ritual_pairs')
        .select('user_a_id, user_b_id, status')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .in('status', ['pending', 'active', 'paused'])

      const existingIds = new Set(
        (existing || []).map(p => p.user_a_id === user.id ? p.user_b_id : p.user_a_id)
      )
      setPairedFriendIds(existingIds)
      setLoading(false)
    } catch (err) {
      console.error('loadFriends error:', err)
      setError('Не удалось загрузить друзей')
      setLoading(false)
    }
  }

  async function submit() {
    if (!selectedFriend || submitting) return
    setSubmitting(true)
    try {
      const userA = user.id < selectedFriend.id ? user.id : selectedFriend.id
      const userB = user.id < selectedFriend.id ? selectedFriend.id : user.id

      const { data: pair, error: e } = await supabase
        .from('ritual_pairs')
        .insert({
          user_a_id: userA,
          user_b_id: userB,
          created_by_id: user.id,
          deck: selectedDeck,
          depth: selectedDepth,
          status: 'pending',
        })
        .select('id')
        .single()

      if (e) throw e
      navigate(`/rituals/pair/${pair.id}`)
    } catch (err) {
      console.error('createPair error:', err)
      setError('Не удалось создать пару — возможно, она уже есть')
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <Header step={step} onBack={() => step > 1 ? setStep(step - 1) : navigate('/rituals')} />

        {error && (
          <div className="bg-rose-50 text-rose-700 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {step === 1 && (
          <Step1Friends
            loading={loading}
            friends={friends}
            pairedFriendIds={pairedFriendIds}
            selectedFriend={selectedFriend}
            onPick={f => { setSelectedFriend(f); setStep(2) }}
          />
        )}

        {step === 2 && selectedFriend && (
          <Step2Deck
            friend={selectedFriend}
            selectedDeck={selectedDeck}
            onPick={d => setSelectedDeck(d)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && selectedFriend && (
          <Step3Confirm
            friend={selectedFriend}
            deck={selectedDeck}
            selectedDepth={selectedDepth}
            onPickDepth={d => setSelectedDepth(d)}
            onSubmit={submit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  )
}

function Header({ step, onBack }) {
  return (
    <div className="flex items-center mb-4">
      <button onClick={onBack} className="text-gray-500 text-sm">← назад</button>
      <div className="flex-1 text-center text-sm text-gray-500">шаг {step} из 3</div>
      <div className="w-12" />
    </div>
  )
}

function Step1Friends({ loading, friends, pairedFriendIds, onPick }) {
  if (loading) {
    return <div className="text-center text-gray-400 py-10 text-sm">Загрузка друзей…</div>
  }

  if (!friends.length) {
    return (
      <div className="bg-white rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🤲</div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Сначала добавь своих</h2>
        <p className="text-sm text-gray-500 mb-4">
          Чтобы создать пару, нужен хотя бы один друг в «Своих».
        </p>
        <Link
          to="/friends"
          className="inline-block bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl"
        >
          К друзьям
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">
        С кем будете отвечать на один вопрос в день?
      </h1>
      <div className="bg-white rounded-2xl overflow-hidden">
        {friends.map((f, i) => {
          const already = pairedFriendIds.has(f.id)
          return (
            <button
              key={f.id}
              disabled={already}
              onClick={() => !already && onPick(f)}
              className={`w-full flex items-center gap-3 p-3 text-left ${
                i < friends.length - 1 ? 'border-b border-gray-100' : ''
              } ${already ? 'opacity-50' : 'hover:bg-gray-50'}`}
            >
              <Avatar username={f.username} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">
                  {f.display_name || f.username}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {already ? 'Уже в ритуале' : '@' + f.username}
                </div>
              </div>
              {!already && (
                <div className="bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  Выбрать
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

function Step2Deck({ friend, selectedDeck, onPick, onNext }) {
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Avatar username={friend.username} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {friend.display_name || friend.username}
          </div>
          <div className="text-xs text-gray-500">от выбора зависит, какие вопросы будут</div>
        </div>
      </div>

      <div className="space-y-2">
        {DECKS.map(d => (
          <button
            key={d.id}
            onClick={() => onPick(d.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
              selectedDeck === d.id
                ? 'border-violet-500 bg-gradient-to-br from-violet-50 to-pink-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="text-2xl">{d.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{d.name}</div>
              <div className="text-xs text-gray-500">{d.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!selectedDeck}
        className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl mt-6 disabled:opacity-50"
      >
        Дальше
      </button>
    </>
  )
}

function Step3Confirm({ friend, deck, selectedDepth, onPickDepth, onSubmit, submitting }) {
  const deckObj = DECKS.find(d => d.id === deck)
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Avatar username={friend.username} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {friend.display_name || friend.username}
          </div>
          <div className="text-xs text-gray-500">
            {deckObj?.emoji} {deckObj?.name?.toLowerCase()}
          </div>
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-700 mb-2">Глубина вопросов</div>
      <div className="flex gap-2 flex-wrap mb-6">
        {DEPTHS.map(d => (
          <button
            key={d.id}
            onClick={() => onPickDepth(d.id)}
            className={`px-4 py-2 rounded-full text-sm border ${
              selectedDepth === d.id
                ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-transparent font-semibold'
                : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-4 mb-6 text-sm text-gray-700 leading-relaxed">
        Когда {friend.display_name || friend.username} примет приглашение, вам обоим начнёт приходить один вопрос в день. Ответы откроются, когда ответите оба.
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
      >
        {submitting ? 'Отправляем…' : 'Отправить приглашение'}
      </button>
    </>
  )
}

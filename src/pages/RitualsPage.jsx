import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRitualPairs } from '../hooks/useRitualPairs'
import PairListItem from '../components/PairListItem'

export default function RitualsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pairs, loading, error } = useRitualPairs(user?.id)

  const hasPairs = pairs.length > 0

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Ритуалы</h1>
          {hasPairs && (
            <Link
              to="/rituals/new"
              className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full"
            >
              + пара
            </Link>
          )}
        </div>

        {loading && (
          <div className="text-center text-gray-400 py-10 text-sm">Загрузка…</div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-2xl p-4 text-center">
            <p className="text-gray-600 text-sm mb-3">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-violet-600 font-semibold text-sm"
            >
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && !hasPairs && (
          <EmptyState onSolo={() => navigate('/rituals/solo')} />
        )}

        {!loading && !error && hasPairs && (
          <>
            <div className="space-y-2">
              {pairs.map(p => (
                <PairListItem
                  key={p.id}
                  pair={p}
                  otherProfile={p.other}
                  status={p.listStatus}
                  streak={p.streak}
                  frozen={p.frozen}
                />
              ))}
            </div>

            <SoloRow />

            <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
              Один вопрос в день для тебя и твоих близких.<br />
              Ответы открываются, когда ответите оба.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onSolo }) {
  return (
    <div className="bg-white rounded-2xl p-6 mt-6">
      <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-pink-100 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4">
        💭
      </div>
      <h2 className="text-center text-lg font-semibold text-gray-900 mb-2">
        Один вопрос в день — для близости
      </h2>
      <p className="text-center text-sm text-gray-500 leading-relaxed mb-5">
        Ты и кто-то из своих отвечаете на один вопрос. Ответы открываются, когда ответите оба.
      </p>

      <Link
        to="/rituals/new"
        className="block w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-center py-3 rounded-xl"
      >
        Создать пару
      </Link>
      <button
        onClick={onSolo}
        className="block w-full mt-2 bg-white border border-gray-200 text-violet-700 font-semibold text-center py-3 rounded-xl"
      >
        Попробовать одному
      </button>
    </div>
  )
}

function SoloRow() {
  return (
    <Link
      to="/rituals/solo"
      className="flex items-center gap-3 p-3 mt-4 rounded-2xl bg-white border border-transparent hover:border-gray-100"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex-shrink-0 relative overflow-hidden">
        <div className="absolute inset-[30%] rounded-full bg-white/85" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900">Только для себя</div>
        <div className="text-xs text-gray-500">Соло-вопрос дня · личный дневник</div>
      </div>
    </Link>
  )
}

import { Link } from 'react-router-dom'
import Avatar from './Avatar'

export default function PairListItem({ pair, otherProfile, status, streak, frozen }) {
  const waiting = status === 'waiting-mine'
  const partnerAnswered = status === 'partner-answered'
  const allDone = status === 'revealed'
  const pendingAccept = status === 'pending-accept'
  const pendingMine = status === 'pending-mine'

  const subline = (() => {
    if (pendingAccept) return `${otherProfile?.display_name || otherProfile?.username} приглашает в ритуал`
    if (pendingMine) return 'Ждём принятия приглашения'
    if (waiting) return 'Ждёт твой ответ'
    if (partnerAnswered) return 'Ответ готов — твоя очередь'
    if (allDone) return 'Оба ответили — посмотри'
    return 'Сегодня ещё ничего'
  })()

  const pulsing = waiting || partnerAnswered || pendingAccept

  return (
    <Link
      to={`/rituals/pair/${pair.id}`}
      className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
        pulsing
          ? 'bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-200'
          : 'bg-white border border-transparent hover:border-gray-100'
      }`}
    >
      <Avatar
        username={otherProfile?.username}
        size="md"
        className={pendingMine ? 'opacity-50' : ''}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-900 truncate">
            {otherProfile?.display_name || otherProfile?.username || '...'}
          </div>
          {streak > 0 && (
            <span className="text-xs font-semibold text-amber-700 bg-gradient-to-br from-amber-100 to-orange-200 px-2 py-0.5 rounded-full">
              {streak} {frozen ? '❄️' : '🔥'}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">{subline}</div>
      </div>
      {pulsing && (
        <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 animate-pulse" />
      )}
    </Link>
  )
}

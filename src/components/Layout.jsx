import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useBadges } from '../hooks/useBadges'
import { useEffect } from 'react'

export default function Layout({ children }) {
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const { unreadChats, pendingFriends, newPosts, markFeedSeen } = useBadges(user?.id)

  // Mark feed as seen when user visits feed page
  useEffect(() => {
    if (location.pathname === '/feed') markFeedSeen()
  }, [location.pathname])

  const tabs = [
    {
      path: '/chats',
      label: 'Чаты',
      badge: unreadChats,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      path: '/feed',
      label: 'Лента',
      badge: newPosts ? 'new' : 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      path: '/friends',
      label: 'Друзья',
      badge: pendingFriends,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-dvh">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">✈️</span>
          <span className="font-semibold text-gray-800">Свои</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{profile?.username}</span>
          <button
            onClick={signOut}
            className="text-gray-400 hover:text-gray-600 text-sm"
            title="Выйти"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="flex bg-white border-t border-gray-100 flex-shrink-0 safe-area-pb">
        {tabs.map(tab => {
          const active = location.pathname.startsWith(tab.path)
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors relative ${
                active ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge ? (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

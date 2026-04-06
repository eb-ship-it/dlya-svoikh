import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import ChatsPage from './pages/ChatsPage'
import FeedPage from './pages/FeedPage'
import FriendsPage from './pages/FriendsPage'
import ProfilePage from './pages/ProfilePage'
import InvitePage from './pages/InvitePage'
import GroupInvitePage from './pages/GroupInvitePage'
import LandingPage from './pages/LandingPage'
import Layout from './components/Layout'

function LoadingScreen() {
  return <div className="min-h-dvh flex items-center justify-center bg-gray-50"><div className="text-gray-400 text-sm">Загрузка...</div></div>
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 max-w-xs w-full text-center">
        <div className="text-3xl mb-3">📡</div>
        <p className="text-gray-800 font-medium mb-1">Не удаётся подключиться</p>
        <p className="text-gray-400 text-sm mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium py-2.5 rounded-xl"
        >
          Повторить
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading, authError } = useAuth()
  if (loading) return <LoadingScreen />
  if (authError) return <ErrorScreen message={authError} />
  if (!user) return <AuthPage />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading, authError } = useAuth()

  if (loading) return <LoadingScreen />
  if (authError) return <ErrorScreen message={authError} />

  // Invite page works for both logged in and not
  return (
    <Routes>
      <Route path="/invite/:username" element={user ? <InvitePage /> : <AuthPage />} />
      <Route path="/group/:code" element={user ? <GroupInvitePage /> : <AuthPage />} />
      <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/auth" element={user ? <Navigate to="/feed" replace /> : <AuthPage />} />
      <Route path="*" element={user ? <Navigate to="/feed" replace /> : <LandingPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import ChatsPage from './pages/ChatsPage'
import FeedPage from './pages/FeedPage'
import FriendsPage from './pages/FriendsPage'
import ProfilePage from './pages/ProfilePage'
import InvitePage from './pages/InvitePage'
import GroupInvitePage from './pages/GroupInvitePage'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-gray-50"><div className="text-gray-400 text-sm">Загрузка...</div></div>
  if (!user) return <AuthPage />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center bg-gray-50"><div className="text-gray-400 text-sm">Загрузка...</div></div>
  }

  // Invite page works for both logged in and not
  return (
    <Routes>
      <Route path="/invite/:username" element={user ? <InvitePage /> : <AuthPage />} />
      <Route path="/group/:code" element={user ? <GroupInvitePage /> : <AuthPage />} />
      <Route path="/chats" element={<ProtectedRoute><ChatsPage /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={user ? <Navigate to="/feed" replace /> : <AuthPage />} />
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

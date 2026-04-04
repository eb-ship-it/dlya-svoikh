import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const params = useParams()
  const inviteFrom = params.username || null
  const [isLogin, setIsLogin] = useState(inviteFrom ? false : true)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim() || (!isLogin && !displayName.trim())) {
      setError('Заполни все поля')
      return
    }
    if (password.length < 6) {
      setError('Пароль минимум 6 символов')
      return
    }
    setLoading(true)
    try {
      if (isLogin) {
        await signIn(username.trim().toLowerCase(), password)
      } else {
        if (!/^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase())) {
          setError('Логин: 3-20 символов, только буквы, цифры, _')
          setLoading(false)
          return
        }
        if (inviteFrom) localStorage.setItem('invite_from', inviteFrom)
        await signUp(username.trim().toLowerCase(), password, displayName.trim())
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) setError('Неверный логин или пароль')
      else if (msg.includes('User already registered')) setError('Этот логин уже занят')
      else setError(msg || 'Что-то пошло не так')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <img src="/icon.svg" alt="" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-lg" />
          <h1 className="text-2xl font-bold text-gray-800">Свои</h1>
          <p className="text-gray-500 text-sm mt-1">
            {inviteFrom ? <><b>@{inviteFrom}</b> приглашает тебя!</> : 'Мессенджер для своих'}
          </p>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
            onClick={() => { setIsLogin(true); setError('') }}
          >
            Войти
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
            onClick={() => { setIsLogin(false); setError('') }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Имя и фамилия</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Елена Иванова"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="твой_логин"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
          >
            {loading ? '...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  )
}

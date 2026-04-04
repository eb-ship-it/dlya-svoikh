// Generate consistent gradient for username
const GRADIENTS = [
  'from-violet-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-violet-500',
  'from-purple-500 to-pink-500',
  'from-fuchsia-500 to-pink-500',
  'from-violet-600 to-indigo-500',
  'from-rose-500 to-pink-600',
  'from-purple-600 to-violet-500',
]

export function avatarGradient(username) {
  if (!username) return GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

// Generate consistent gradient for username
const GRADIENTS = [
  'from-violet-300 to-purple-400',
  'from-pink-300 to-rose-400',
  'from-indigo-300 to-violet-400',
  'from-purple-300 to-pink-400',
  'from-fuchsia-300 to-pink-400',
  'from-violet-400 to-indigo-300',
  'from-rose-300 to-pink-400',
  'from-purple-400 to-violet-300',
]

export function avatarGradient(username) {
  if (!username) return GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

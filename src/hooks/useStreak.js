// Light streak: count consecutive days ending today or yesterday.
// One missed day allowed (returns frozen=true). Two missed days → reset to 0.
//
// Input: array of YYYY-MM-DD date strings (any order, can have duplicates)
// Output: { streak, frozen }
export function computeStreak(dates) {
  if (!dates?.length) return { streak: 0, frozen: false }

  const set = new Set(dates)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fmt = d => d.toISOString().slice(0, 10)
  const todayStr = fmt(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = fmt(yesterday)

  // Determine endpoint: today if answered today, else yesterday (frozen).
  let cursor
  let frozen = false
  if (set.has(todayStr)) {
    cursor = new Date(today)
  } else if (set.has(yesterdayStr)) {
    cursor = new Date(yesterday)
    frozen = true
  } else {
    return { streak: 0, frozen: false }
  }

  let streak = 0
  while (set.has(fmt(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { streak, frozen }
}

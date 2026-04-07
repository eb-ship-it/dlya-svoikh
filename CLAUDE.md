# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm run dev          # Start dev server (Vite HMR)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

Deployed to Vercel (auto-deploy on push to main). SPA routing handled via `vercel.json` rewrite.

## Architecture

**Stack:** React 19 + Vite 8 + Tailwind CSS 4 + Supabase (PostgreSQL/Auth/Realtime) + Vercel

**Language:** Russian UI. All user-facing text is in Russian.

### Backend (Supabase)

- Auth uses username-based login (emails generated as `{username}@messenger.local`)
- All security enforced via Row Level Security (RLS) policies — never trust frontend checks alone
- Sensitive operations (group invite joins, friend auto-accept) use `SECURITY DEFINER` RPC functions to bypass RLS safely
- Schema migrations in `src/lib/migrations-v*.sql` (v2 through v8) — run manually in Supabase SQL Editor
- Base schema in `src/lib/supabase.sql`
- Supabase client config in `src/lib/supabase.js` (publishable key only)

### Key Patterns

**Auth:** `src/context/AuthContext.jsx` — Context provider with `useAuth()` hook. Has timeout protection (10s getSession, 15s safety fallback) for unreliable mobile networks. Exposes `user`, `profile`, `loading`, `authError`.

**Realtime + Polling:** Supabase Realtime WebSockets are unreliable on some mobile browsers (especially Huawei without Google services + Opera). Always add polling fallback (10s interval) for critical features. See `src/hooks/useBadges.js` for the pattern.

**Avatars:** `src/components/Avatar.jsx` — Canvas-based procedural face generation from username hash. Sizes: xs/sm/md/lg/xl/xxl. Group avatars use rounded-square shape with letter; personal avatars are round with generated faces.

**Mayachok (AI advisor):** Posts generated externally via n8n workflow (GPT) → written to `mayachok_posts` table via Supabase service_role key. Frontend only reads and displays. See `src/lib/n8n-workflow-guide.md`.

### Routing (src/App.jsx)

Protected routes wrapped in `ProtectedRoute` (requires auth + shows Layout). Public routes: `/invite/:username`, `/group/:code`. Default redirect: `/feed`.

### Database Tables

Core: `profiles`, `friendships`, `chats`, `chat_participants`, `messages`
Feed: `posts`, `post_reactions`, `post_comments`, `feed_last_seen`
Mayachok: `mayachok_settings`, `mayachok_posts`
Other: `suggestions`

### Mobile Considerations

Target device: Huawei P40 Pro (no Google services) + Opera browser. Key issues encountered:
- Supabase Realtime hangs → solved with polling fallback
- Auth getSession hangs on mobile networks → solved with Promise.race timeout
- CSS overflow clips badges → solved by placing badges inline, not absolutely positioned outside parent
- Always use `dvh` units instead of `vh` for mobile viewport

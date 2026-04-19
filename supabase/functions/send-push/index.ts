import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:aiservices@anyclass.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

interface WebhookBody {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
}

interface PushPayload {
  title: string
  body: string
  tag: string
  url: string
}

interface Recipient {
  user_id: string
  payload: PushPayload
}

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get('authorization') || ''
    if (!WEBHOOK_SECRET || auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response('unauthorized', { status: 401 })
    }
    const body: WebhookBody = await req.json()
    const recipients = await resolveRecipients(body)

    for (const r of recipients) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', r.user_id)

      for (const s of subs || []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(r.payload),
          )
        } catch (e: any) {
          if (e?.statusCode === 410 || e?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          } else {
            console.error('push send failed', e?.statusCode, e?.body || e?.message)
          }
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, sent: recipients.length }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e: any) {
    console.error('handler error', e?.message)
    return new Response(JSON.stringify({ ok: false, error: e?.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})

async function resolveRecipients(body: WebhookBody): Promise<Recipient[]> {
  if (body.table === 'messages' && body.type === 'INSERT') {
    return resolveMessageRecipients(body.record as any)
  }
  if (body.table === 'friendships') {
    return resolveFriendshipRecipients(body)
  }
  return []
}

async function resolveMessageRecipients(msg: {
  chat_id: string
  sender_id: string
  content: string
}): Promise<Recipient[]> {
  const [{ data: parts }, { data: sender }, { data: chat }] = await Promise.all([
    supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', msg.chat_id)
      .neq('user_id', msg.sender_id),
    supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', msg.sender_id)
      .single(),
    supabase
      .from('chats')
      .select('name')
      .eq('id', msg.chat_id)
      .single(),
  ])

  if (!parts || !sender) return []

  const senderName = sender.display_name || sender.username || 'Свои'
  const isGroup = !!chat?.name

  return Promise.all(parts.map(async (p: { user_id: string }) => {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('chat_id', msg.chat_id)
      .neq('sender_id', p.user_id)
      .is('read_at', null)

    const unread = count || 1
    const title = isGroup ? chat!.name! : senderName
    const text = unread > 1
      ? `${unread} ${plural(unread, 'новое сообщение', 'новых сообщения', 'новых сообщений')} от ${senderName}`
      : (isGroup ? `${senderName}: ${msg.content}` : msg.content)

    return {
      user_id: p.user_id,
      payload: {
        title,
        body: truncate(text, 140),
        tag: `chat-${msg.chat_id}`,
        url: `/chats?open=${msg.chat_id}`,
      },
    }
  }))
}

async function resolveFriendshipRecipients(body: WebhookBody): Promise<Recipient[]> {
  const f = body.record as { id: string; requester_id: string; addressee_id: string; status: string }

  if (body.type === 'INSERT' && f.status === 'pending') {
    const { data: from } = await supabase
      .from('profiles').select('display_name, username').eq('id', f.requester_id).single()
    const name = from?.display_name || from?.username || 'Кто-то'
    return [{
      user_id: f.addressee_id,
      payload: {
        title: 'Свои',
        body: `${name} хочет добавить тебя в друзья`,
        tag: 'friend-request',
        url: '/friends',
      },
    }]
  }

  if (body.type === 'UPDATE' && f.status === 'accepted') {
    const old = body.old_record as { status?: string } | undefined
    if (old?.status === 'accepted') return []
    const { data: who } = await supabase
      .from('profiles').select('display_name, username').eq('id', f.addressee_id).single()
    const name = who?.display_name || who?.username || 'Друг'
    return [{
      user_id: f.requester_id,
      payload: {
        title: 'Свои',
        body: `${name} принял(а) заявку в друзья`,
        tag: 'friend-accept',
        url: '/friends',
      },
    }]
  }

  return []
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

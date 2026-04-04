# Настройка n8n workflow для Маячка

## Что нужно
- Работающий n8n
- Подключённый OpenAI (GPT) в n8n
- service_role ключ Supabase (Dashboard → Settings → API → service_role key)

## Workflow: 5 нод

### 1. Schedule Trigger
- **Тип:** Schedule Trigger
- **Настройки:** Каждый день в 08:00 (или другое время)

### 2. HTTP Request — Получить пользователей с включённым Маячком
- **Метод:** GET
- **URL:** `https://owmhksmhqvgpfanftane.supabase.co/rest/v1/mayachok_settings?enabled=eq.true&select=user_id,goals`
- **Headers:**
  - `apikey`: `{service_role_key}`
  - `Authorization`: `Bearer {service_role_key}`

### 3. Split In Batches (Loop)
- Для обработки каждого пользователя отдельно

### 4. HTTP Request — Получить последние оценки
- **Метод:** GET  
- **URL:** `https://owmhksmhqvgpfanftane.supabase.co/rest/v1/mayachok_posts?user_id=eq.{{ $json.user_id }}&order=created_at.desc&limit=5&select=post_type,rating`
- **Headers:** те же apikey + Authorization

### 5. OpenAI (или AI Agent)
- **Model:** gpt-4o-mini (дешевле) или gpt-4o
- **System prompt:**
```
Ты — Маячок, дружелюбный персональный помощник в мессенджере "Свои".
Твоя задача — каждый день писать короткое полезное сообщение пользователю.

Правила:
- Пиши 2-3 предложения, не больше
- Обращайся на "ты"
- Тон: тёплый, поддерживающий, без пафоса
- Не начинай с "Привет" каждый раз — разнообразь
- В конце можешь добавить 1 подходящий эмодзи
```

- **User prompt:**
```
Цели пользователя: {{ $json.goals }}

История оценок последних советов:
{{ $json.ratings_summary }}

Сгенерируй сообщение одного из типов (выбери случайно):
- tip (практический совет по привычкам)
- motivation (мотивирующая мысль или цитата)  
- fact (интересный факт по теме целей)
- reminder (мягкое напоминание о целях)

Ответь в формате JSON:
{"content": "текст сообщения", "post_type": "тип"}
```

### 6. HTTP Request — Записать пост
- **Метод:** POST
- **URL:** `https://owmhksmhqvgpfanftane.supabase.co/rest/v1/mayachok_posts`
- **Headers:**
  - `apikey`: `{service_role_key}`
  - `Authorization`: `Bearer {service_role_key}`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- **Body (JSON):**
```json
{
  "user_id": "{{ $json.user_id }}",
  "content": "{{ $json.content }}",
  "post_type": "{{ $json.post_type }}"
}
```

## Тестирование
1. Включи Маячок в профиле приложения и введи цели
2. Запусти workflow вручную в n8n (кнопка "Execute Workflow")
3. Открой ленту — пост Маячка должен появиться первым
4. Если всё работает — включи Schedule Trigger

## Где взять service_role key
Supabase Dashboard → Settings → API → Project API keys → `service_role` (НЕ anon!)
⚠️ Этот ключ обходит RLS — храни его только в n8n credentials, не в коде!

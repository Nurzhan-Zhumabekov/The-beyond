# API-контракт Edge Function `generate-content`

Edge Function вызывается авторизованным пользователем. JWT передаётся стандартным
заголовком Supabase:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Функция обязана получить `auth.uid()` из проверенного JWT и убедиться, что
`projects.user_id` для переданного `project_id` равен этому uid. Нельзя доверять
`user_id` из тела запроса и нельзя принимать `service_role` токен от frontend.

## Запрос

```json
{
  "project_id": "d8c00000-0000-4000-8000-000000000001",
  "source_type": "text",
  "source": "Исходный материал",
  "language": "ru",
  "output_type": "media_pack",
  "campaign_name": "AI Conference",
  "image_style": "futuristic",
  "additional_instructions": ""
}
```

Обязательные поля: `project_id`, `source_type`, `source`, `output_type`. Допустимые
значения:

- `source_type`: `text`, `url`;
- `output_type`: `background`, `poster`, `banner`, `media_pack`;
- `language`: ISO-код либо `auto`.

Если `source_type=text`, функция сохраняет `source` в `source_text`. Если
`source_type=url`, функция сначала безопасно проверяет URL, затем сохраняет его в
`source_url`. Второе поле остаётся `null`, чтобы выполнялось ограничение базы.

## Успешный ответ

HTTP `200`:

```json
{
  "generation_id": "1a300000-0000-4000-8000-000000000001",
  "status": "completed",
  "title": "Будущее искусственного интеллекта",
  "key_points": ["Тезис 1", "Тезис 2", "Тезис 3"],
  "social_posts": {
    "telegram": "Текст",
    "instagram": "Текст",
    "linkedin": "Текст"
  },
  "image_prompt": "Futuristic AI laboratory, no text, no letters, no watermark",
  "usage": {
    "llm_calls": 1,
    "input_tokens": 1200,
    "output_tokens": 700,
    "estimated_cost": 0.02
  }
}
```

## Жизненный цикл generation

1. После проверки запроса создать строку со статусом `processing`, поскольку
   Edge Function сразу начинает обработку без отдельной очереди.
2. После успешной валидации результата записать тексты, usage и статус `completed`.
3. При ошибке записать безопасное `error_message` и статус `failed`.
4. Статус `pending` зарезервирован для будущей очереди фоновых заданий.
5. Не записывать API-ключи, полный stack trace и чувствительные данные в
   `error_message`.

Edge Function второго AI владеет переходами статусов, но не изменяет SQL-схему и RLS.

## Ошибка

Ответ должен иметь единый формат:

```json
{
  "error": {
    "code": "INVALID_SOURCE",
    "message": "Source URL is not allowed"
  }
}
```

Рекомендуемые статусы:

- `400` — невалидное тело или источник;
- `401` — отсутствующий/невалидный JWT;
- `403` — проект принадлежит другому пользователю;
- `404` — проект не найден;
- `409` — generation уже обрабатывается или конфликт состояния;
- `429` — лимит запросов;
- `502` — ошибка внешнего AI-провайдера;
- `500` — непредвиденная ошибка без раскрытия внутренней информации.

## Контракт с Visual Engine

После завершения LLM-этапа Visual Engine получает `generation_id`, `output_type`,
`title`, `image_prompt` и брендбук. Он сохраняет файлы в `generated-assets` по пути:

```text
{user_id}/{project_id}/generations/{generation_id}/{filename}
```

После загрузки он создаёт строки `assets` с `storage_path`, `asset_type`, `format`,
размерами, версией и опциональным `parent_asset_id`.

## Edge Function `generate-image`

Функция запускает официальный `black-forest-labs/flux-schnell` через Replicate
только после успешного `generate-content`. Ключ `REPLICATE_API_TOKEN` хранится в
Supabase Secrets и никогда не передаётся во frontend.

```http
POST /functions/v1/generate-image
Authorization: Bearer <access_token>
Content-Type: application/json
```

```json
{
  "generation_id": "1a300000-0000-4000-8000-000000000001",
  "force": false,
  "seed": 42
}
```

`force` и `seed` необязательны. Без `force` уже существующий фон возвращается
повторно без платного вызова модели. Для `poster` используется композиция `1:1`,
для остальных типов — `16:9`. Результат проверяется как PNG, загружается в
приватный bucket `generated-assets`, записывается в `assets` как `background` и
возвращается с подписанной ссылкой на один час.

Успешный первый вызов отвечает HTTP `201`, повторное использование — HTTP `200`:

```json
{
  "generation_id": "1a300000-0000-4000-8000-000000000001",
  "prediction_id": "abc123",
  "asset": {
    "id": "b1200000-0000-4000-8000-000000000001",
    "asset_type": "background",
    "format": "png",
    "storage_path": "<user>/<project>/generations/<generation>/background-v1-<uuid>.png",
    "width": 1344,
    "height": 768,
    "version": 1,
    "signed_url": "https://...",
    "signed_url_expires_in": 3600
  },
  "reused": false
}
```

Функция использует JWT пользователя для запросов к БД и Storage, поэтому RLS
проверяет владение generation. Внешние URL ограничены доменами Replicate, размер
файла — 25 MiB, а при ошибке записи метаданных загруженный orphan-файл удаляется.

Для локального запуска создайте игнорируемый Git файл с новым токеном Replicate и
передайте его CLI:

```powershell
supabase functions serve generate-image --env-file supabase/functions/.env.local
```

Для подключённого облачного проекта секрет и функция публикуются отдельно:

```powershell
supabase secrets set REPLICATE_API_TOKEN=<new_replicate_token>
supabase functions deploy generate-image
```

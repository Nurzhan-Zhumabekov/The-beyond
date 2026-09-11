# База данных AI Content Factory

Проект использует Supabase Auth, Postgres и два приватных Storage bucket. Все
пользовательские таблицы защищены Row Level Security. Клиент работает с Supabase под
JWT пользователя; `service_role` запрещено передавать во frontend.

## Схема данных

### `profiles`

Профиль один-к-одному связан с `auth.users`. Строка создаётся триггером
`handle_new_user()` после регистрации. `display_name` берётся из `display_name` или
`name` в metadata, затем из части email до `@`. Удаление Auth-пользователя каскадно
удаляет профиль и его проекты.

Основные поля: `id`, `display_name`, `avatar_url`, `created_at`, `updated_at`.

### `projects`

Проект принадлежит одному пользователю через `user_id`. Индекс по `user_id` ускоряет
список проектов. `name` обязателен и ограничен 120 символами.

Основные поля: `id`, `user_id`, `name`, `description`, `created_at`, `updated_at`.

### `brandbooks`

На проект разрешён ровно один брендбук: `project_id` имеет `unique`. Цвета принимаются
только в формате `#RRGGBB`; `overlay_opacity` находится в диапазоне 0–1. Логотипы
хранятся в приватном bucket `brand-assets`, а в таблице записываются только пути.

Основные поля: `id`, `project_id`, `brand_name`, `light_logo_path`, `dark_logo_path`,
цвета, opacity, шрифты и timestamps.

### `generations`

Хранит запрос и результат Edge Function `generate-content`.

- `source_type`: `text` или `url`;
- при `text` обязателен только `source_text`;
- при `url` обязателен только `source_url`;
- `output_type`: `background`, `poster`, `banner`, `media_pack`;
- `status`: `pending`, `processing`, `completed`, `failed`;
- `key_points` всегда JSON-массив;
- `social_posts` всегда JSON-объект;
- счётчики токенов, вызовов и стоимость неотрицательны.

Индекс `(project_id, created_at desc)` используется для истории генераций.

### `assets`

Описывает созданный визуальный файл. В `storage_path` хранится путь внутри
`generated-assets`, а не публичный URL. Вариации связываются через `parent_asset_id`;
номер версии начинается с 1.

- `asset_type`: `background`, `poster`, `banner`;
- `format`: `png`, `jpg`;
- `width` и `height`, если заданы, должны быть положительными.

## Storage

Миграция создаёт два приватных bucket:

- `brand-assets` — логотипы и брендовые ресурсы, лимит файла 10 MiB;
- `generated-assets` — результаты генерации, лимит файла 25 MiB.

Обязательная структура пути:

```text
{user_id}/{project_id}/...
```

Примеры:

```text
6f2.../d8c.../logos/light-logo.png
6f2.../d8c.../generations/1a3.../poster-v1.png
```

RLS Storage проверяет, что первый сегмент равен `auth.uid()`. Buckets приватные, поэтому
для показа или скачивания frontend должен использовать авторизованный download либо
короткоживущий signed URL.

## Row Level Security

- Пользователь читает и изменяет только собственный `profile`.
- Пользователь выполняет CRUD только над проектами, где `user_id = auth.uid()`.
- Доступ к брендбукам и генерациям проверяется через принадлежащий пользователю проект.
- Доступ к assets проверяется через цепочку `asset → generation → project`.
- Storage разрешает CRUD только в двух проектных buckets и только под собственным
  префиксом пути.
- Политик `USING (true)` для пользовательских данных нет.

## Порядок миграций

```text
001_profiles.sql
002_projects.sql
003_brandbooks.sql
004_generations.sql
005_assets.sql
006_storage.sql
007_rls.sql
```

Локальная проверка при наличии Docker и Supabase CLI:

```bash
supabase start
supabase db reset
supabase db lint
```

`seed.sql` намеренно не содержит пользователей, email, паролей или токенов.

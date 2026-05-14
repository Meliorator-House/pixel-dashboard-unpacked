# Jedi Focus Telegram Bot

Python-бот для уведомлений, баланса и команд `/balik`, `/today`, `/focus`, `/stats`, `/goals`.

## 1. Создай бота

1. Открой Telegram.
2. Найди `@BotFather`.
3. Напиши `/newbot`.
4. Скопируй токен.

## 2. Узнай свой TELEGRAM_USER_ID

Самый простой способ: напиши любому боту типа `@userinfobot` и скопируй ID.

## 3. Установка локально

```bash
cd bot
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Заполни `.env`:

```env
TELEGRAM_BOT_TOKEN=твой_токен
TELEGRAM_USER_ID=твой_id
API_KEY=можно_пусто
```

## 4. Запуск Telegram polling-бота

```bash
python bot.py
```

## 5. Запуск API-сервера для связи сайта с ботом

```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

Проверка:

```txt
http://localhost:8000
```

## 6. Куда залить бота, чтобы работал 24/7

Лучше всего:

- Render
- Railway
- Fly.io
- VPS

Для Render/Railway обычно команда запуска API:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

А для polling-бота:

```bash
python bot.py
```

Для полноценной работы можно запустить либо API-сервер, либо polling-бота, либо два процесса через отдельный Procfile/worker.

## 7. Связка с сайтом

После деплоя `server.py` получишь URL:

```txt
https://your-bot-service.onrender.com
```

Вставь его в сайте в раздел **Бот** → **Bot API URL**.

После этого сайт сможет отправлять:
- тестовые уведомления;
- уведомления о пополнении баланса;
- уведомления о задачах.

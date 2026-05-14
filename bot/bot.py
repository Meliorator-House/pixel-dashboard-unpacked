import asyncio
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command
from aiogram.types import Message
from data_store import load_data, format_money, get_today_tasks

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
USER_ID = os.getenv("TELEGRAM_USER_ID")

if not TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN не указан в .env")

bot = Bot(token=TOKEN)
dp = Dispatcher()


def allowed(message: Message) -> bool:
    if not USER_ID:
        return True
    return str(message.from_user.id) == str(USER_ID)


@dp.message(Command("start"))
async def start(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    await message.answer(
        "🐬 Jedi Focus Bot запущен.\n\n"
        "Команды:\n"
        "/balik — баланс\n"
        "/today — задачи дня\n"
        "/focus — фокус дня\n"
        "/stats — статистика\n"
        "/goals — цели"
    )


@dp.message(Command("balik"))
async def balik(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    data = load_data()
    balance = float(data.get("balance", 0))
    income = float(data.get("income", 0))
    expense = float(data.get("expense", 0))
    spend_limit = max(0, balance * 0.5)
    await message.answer(
        "💰 Баланс Jedi Focus\n\n"
        f"Текущий баланс: {format_money(balance)}\n"
        f"Доходы: {format_money(income)}\n"
        f"Расходы: {format_money(expense)}\n"
        f"Можно потратить по правилу 50%: {format_money(spend_limit)}\n"
        f"Лучше оставить: {format_money(balance - spend_limit)}"
    )


@dp.message(Command("today"))
async def today(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    tasks = get_today_tasks()
    if not tasks:
        await message.answer("На сегодня задач в боте нет. Добавь их через сайт или API.")
        return
    text = "📌 Задачи дня:\n\n" + "\n".join(
        f"— {task.get('title')} · {task.get('time', 'без времени')}" for task in tasks
    )
    await message.answer(text)


@dp.message(Command("focus"))
async def focus(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    data = load_data()
    await message.answer(f"🎯 Фокус дня:\n{data.get('focus', 'не задан')}")


@dp.message(Command("stats"))
async def stats(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    data = load_data()
    tasks = get_today_tasks()
    await message.answer(
        "📊 Статистика дня\n\n"
        f"Задач в боте сегодня: {len(tasks)}\n"
        f"Баланс: {format_money(float(data.get('balance', 0)))}\n"
        f"Событий сохранено: {len(data.get('events', []))}"
    )


@dp.message(Command("goals"))
async def goals(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    data = load_data()
    goals_list = data.get("goals", [])
    if not goals_list:
        await message.answer("Целей пока нет.")
        return
    lines = []
    for goal in goals_list:
        target = float(goal.get("target", 0))
        saved = float(goal.get("saved", 0))
        percent = round(saved / target * 100) if target else 0
        lines.append(f"— {goal.get('title')}: {format_money(saved)} / {format_money(target)} · {percent}%")
    await message.answer("🎯 Финансовые цели:\n\n" + "\n".join(lines))


@dp.message(F.text)
async def fallback(message: Message):
    if not allowed(message):
        await message.answer("Нет доступа.")
        return
    await message.answer("Команда не распознана. Используй /start")


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())

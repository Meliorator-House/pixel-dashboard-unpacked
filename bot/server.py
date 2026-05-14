import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from aiogram import Bot

from data_store import add_balance, add_event, add_task, format_money, load_data

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
USER_ID = os.getenv("TELEGRAM_USER_ID")
API_KEY = os.getenv("API_KEY", "")

if not TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN не указан в .env")

bot = Bot(token=TOKEN)
app = FastAPI(title="Jedi Focus Bot API")


class NotifyPayload(BaseModel):
    message: str


class BalancePayload(BaseModel):
    amount: float
    balance: Optional[float] = None
    category: str = "Доход"
    note: str = ""


class TaskPayload(BaseModel):
    title: str
    date: str
    time: str = ""
    hours_left: int = 0


def check_key(x_api_key: Optional[str]) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


async def send(text: str) -> None:
    if not USER_ID:
        return
    await bot.send_message(chat_id=int(USER_ID), text=text)


@app.get("/")
async def root():
    return {"status": "ok", "service": "Jedi Focus Bot API"}


@app.get("/state")
async def state(x_api_key: Optional[str] = Header(None)):
    check_key(x_api_key)
    return load_data()


@app.post("/notify")
async def notify(payload: NotifyPayload, x_api_key: Optional[str] = Header(None)):
    check_key(x_api_key)
    add_event("notify", payload.model_dump())
    await send(f"🐬 {payload.message}")
    return {"ok": True}


@app.post("/event/balance")
async def balance_event(payload: BalancePayload, x_api_key: Optional[str] = Header(None)):
    check_key(x_api_key)
    data = add_balance(payload.amount, payload.category, payload.note)
    await send(
        "💰 Баланс пополнен\n\n"
        f"+{format_money(payload.amount)}\n"
        f"Текущий баланс: {format_money(float(data.get('balance', 0)))}\n"
        "Команда для проверки: /balik"
    )
    return {"ok": True, "balance": data.get("balance", 0)}


@app.post("/event/task")
async def task_event(payload: TaskPayload, x_api_key: Optional[str] = Header(None)):
    check_key(x_api_key)
    add_task(payload.title, payload.date, payload.time, payload.hours_left)
    await send(
        "⏰ Держите фокус\n\n"
        f"У вас осталось примерно {payload.hours_left} ч. до выполнения задачи:\n"
        f"«{payload.title}»"
    )
    return {"ok": True}

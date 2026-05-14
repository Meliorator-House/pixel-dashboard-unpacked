import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

DATA_FILE = Path(os.getenv("DATA_FILE", "data.json"))


def default_data() -> Dict[str, Any]:
    return {
        "balance": 0,
        "income": 0,
        "expense": 0,
        "focus": "Закрыть главную задачу дня",
        "tasks": [],
        "goals": [],
        "events": [],
    }


def load_data() -> Dict[str, Any]:
    if not DATA_FILE.exists():
        save_data(default_data())
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except Exception:
        data = default_data()
    base = default_data()
    base.update(data)
    return base


def save_data(data: Dict[str, Any]) -> None:
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def add_event(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = load_data()
    event = {
        "type": event_type,
        "payload": payload,
        "created_at": datetime.utcnow().isoformat(),
    }
    data["events"].insert(0, event)
    data["events"] = data["events"][:100]
    save_data(data)
    return data


def add_balance(amount: float, category: str = "Доход", note: str = "") -> Dict[str, Any]:
    data = load_data()
    data["balance"] = float(data.get("balance", 0)) + amount
    data["income"] = float(data.get("income", 0)) + amount
    data["events"].insert(0, {
        "type": "balance",
        "payload": {"amount": amount, "category": category, "note": note, "balance": data["balance"]},
        "created_at": datetime.utcnow().isoformat(),
    })
    save_data(data)
    return data


def add_task(title: str, date: str, time: str, hours_left: int = 0) -> Dict[str, Any]:
    data = load_data()
    data["tasks"].insert(0, {
        "title": title,
        "date": date,
        "time": time,
        "hours_left": hours_left,
        "notified": True,
        "created_at": datetime.utcnow().isoformat(),
    })
    data["tasks"] = data["tasks"][:100]
    save_data(data)
    return data


def format_money(value: float) -> str:
    return f"{value:,.0f} ₽".replace(",", " ")


def get_today_tasks() -> List[Dict[str, Any]]:
    today = datetime.now().date().isoformat()
    return [task for task in load_data().get("tasks", []) if task.get("date") == today]

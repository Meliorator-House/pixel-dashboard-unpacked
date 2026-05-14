import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Flame,
  FolderKanban,
  Goal,
  Home,
  Leaf,
  ListChecks,
  MoonStar,
  Pencil,
  Plus,
  Rocket,
  Settings,
  Sparkles,
  Trash2,
  WalletCards,
  Waves
} from "lucide-react";

type Section = "home" | "tasks" | "calendar" | "projects" | "finance" | "goals" | "habits" | "stats" | "settings";
type Priority = "low" | "medium" | "high";
type ProjectStatus = "new" | "work" | "almost" | "done";

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: Priority;
  done: boolean;
  reminder: boolean;
  projectId?: string;
  notified?: boolean;
  createdAt: string;
};

type Project = {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: ProjectStatus;
  createdAt: string;
};

type FinanceOperation = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  createdAt: string;
};

type FinanceGoal = {
  id: string;
  title: string;
  target: number;
  saved: number;
  deadline: string;
};

type Habit = {
  id: string;
  title: string;
  days: string[];
};

type AppState = {
  tasks: Task[];
  projects: Project[];
  operations: FinanceOperation[];
  goals: FinanceGoal[];
  habits: Habit[];
  focus: string;
  desiredIncome: number;
  botApiUrl: string;
  botApiKey: string;
  lastOpenDate: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

const initialState: AppState = {
  tasks: [
    {
      id: uid(),
      title: "Настроить главный фокус дня",
      date: todayISO(),
      time: "12:00",
      priority: "high",
      done: false,
      reminder: true,
      createdAt: new Date().toISOString()
    },
    {
      id: uid(),
      title: "Проверить финансы и цели",
      date: todayISO(),
      time: "18:00",
      priority: "medium",
      done: false,
      reminder: false,
      createdAt: new Date().toISOString()
    }
  ],
  projects: [
    {
      id: uid(),
      title: "Jedi Focus Dashboard",
      description: "Пиксельный AI-офис с задачами, деньгами и привычками.",
      deadline: todayISO(),
      status: "work",
      createdAt: new Date().toISOString()
    }
  ],
  operations: [
    {
      id: uid(),
      type: "income",
      amount: 50000,
      category: "Старт",
      note: "Стартовый баланс",
      createdAt: new Date().toISOString()
    }
  ],
  goals: [
    {
      id: uid(),
      title: "Финансовая подушка",
      target: 100000,
      saved: 15000,
      deadline: ""
    }
  ],
  habits: [
    {
      id: uid(),
      title: "Фокус без телефона 60 минут",
      days: [todayISO()]
    }
  ],
  focus: "Закрыть главную задачу дня",
  desiredIncome: 150000,
  botApiUrl: import.meta.env.VITE_BOT_API_URL || "",
  botApiKey: import.meta.env.VITE_BOT_API_KEY || "",
  lastOpenDate: todayISO()
};

const sectionCopy: Record<Section, string> = {
  home: "Добро пожаловать в Jedi Focus. Держим курс на спокойный и сильный день.",
  tasks: "Здесь твои задачи дня. Закрой главное, не распыляйся.",
  calendar: "Календарь показывает только то, что ты сам добавил.",
  projects: "Проекты — это твоя карта движения. Двигай по шагам.",
  finance: "Финансы под контролем. Помни правило: не тратить больше 50% баланса.",
  goals: "Цели заряжают фокус. Видишь прогресс — проще дойти.",
  habits: "Привычки делают результат автоматическим. Отмечай каждый день.",
  stats: "Отчёт дня показывает реальную картину без воды.",
  settings: "Здесь подключается Telegram-бот и уведомления."
};

const navItems: { key: Section; label: string; icon: ElementType }[] = [
  { key: "home", label: "Главная", icon: Home },
  { key: "tasks", label: "Задачи", icon: ListChecks },
  { key: "calendar", label: "Календарь", icon: CalendarDays },
  { key: "projects", label: "Проекты", icon: FolderKanban },
  { key: "finance", label: "Финансы", icon: WalletCards },
  { key: "goals", label: "Цели", icon: Goal },
  { key: "habits", label: "Привычки", icon: Flame },
  { key: "stats", label: "Статистика", icon: Sparkles },
  { key: "settings", label: "Бот", icon: Settings }
];

const saveState = (state: AppState) => {
  localStorage.setItem("jedi-focus-dashboard", JSON.stringify(state));
};

const loadState = (): AppState => {
  try {
    const raw = localStorage.getItem("jedi-focus-dashboard");
    if (!raw) return initialState;
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value)) + " ₽";
}

function getMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = Array(offset).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i + 1).toISOString().slice(0, 10));
  }
  return days;
}

function deadlineText(task: Task) {
  if (!task.date || !task.time) return "без срока";
  const deadline = new Date(`${task.date}T${task.time}`);
  const diff = deadline.getTime() - Date.now();
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 36e5);
  const minutes = Math.floor((abs % 36e5) / 6e4);
  if (diff < 0) return `просрочено на ${hours}ч ${minutes}м`;
  return `осталось ${hours}ч ${minutes}м`;
}

function PixelDolphin({ talking }: { talking: boolean }) {
  return (
    <div className={`dolphin-wrap ${talking ? "talking" : ""}`} aria-label="pixel dolphin assistant">
      <svg className="dolphin-svg" viewBox="0 0 96 72" role="img">
        <rect x="24" y="18" width="42" height="6" className="d-dark" />
        <rect x="18" y="24" width="54" height="6" className="d-main" />
        <rect x="12" y="30" width="66" height="6" className="d-main" />
        <rect x="10" y="36" width="72" height="6" className="d-main" />
        <rect x="6" y="42" width="62" height="6" className="d-main" />
        <rect x="4" y="48" width="36" height="6" className="d-main" />
        <rect x="42" y="48" width="28" height="6" className="d-light" />
        <rect x="54" y="54" width="22" height="6" className="d-light" />
        <rect x="66" y="60" width="12" height="6" className="d-light" />
        <rect x="72" y="66" width="6" height="6" className="d-light" />
        <rect x="72" y="42" width="10" height="24" className="d-dark" />
        <rect x="78" y="48" width="8" height="18" className="d-main" />
        <rect x="84" y="58" width="6" height="12" className="d-main" />
        <rect x="34" y="12" width="28" height="6" className="d-light" />
        <rect x="50" y="6" width="18" height="6" className="d-main" />
        <rect x="64" y="12" width="10" height="6" className="d-main" />
        <rect x="22" y="54" width="10" height="12" className="d-dark" />
        <rect x="32" y="54" width="12" height="6" className="d-main" />
        <rect x="50" y="54" width="8" height="12" className="d-dark" />
        <rect x="58" y="60" width="8" height="6" className="d-main" />
        <rect x="62" y="24" width="4" height="4" className="eye" />
        <rect x="12" y="42" width={talking ? 22 : 14} height={talking ? 6 : 3} className="mouth" />
        <rect x="12" y="48" width="26" height="3" className="d-outline" />
        <rect x="6" y="36" width="6" height="6" className="d-outline" />
        <rect x="18" y="24" width="6" height="6" className="d-outline" />
      </svg>
    </div>
  );
}

function useTypewriter(text: string, soundEnabled: boolean, beep: () => void) {
  const [out, setOut] = useState("");
  const [talking, setTalking] = useState(false);

  useEffect(() => {
    setOut("");
    setTalking(true);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (soundEnabled && i % 2 === 0) beep();
      if (i >= text.length) {
        window.clearInterval(timer);
        setTimeout(() => setTalking(false), 500);
      }
    }, 28);
    return () => window.clearInterval(timer);
  }, [text, soundEnabled]);

  return { out, talking };
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [active, setActive] = useState<Section>("home");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [viewMonth, setViewMonth] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [adviceAmount, setAdviceAmount] = useState(0);
  const [adviceName, setAdviceName] = useState("");
  const [tick, setTick] = useState(0);
  const audioCtx = useRef<AudioContext | null>(null);

  const beep = () => {
    try {
      audioCtx.current = audioCtx.current || new AudioContext();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 660;
      gain.gain.value = 0.025;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      /* browser blocked audio */
    }
  };

  const notifySound = () => {
    try {
      audioCtx.current = audioCtx.current || new AudioContext();
      const ctx = audioCtx.current;
      [520, 720, 940].forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.value = 0.035;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.06);
      });
    } catch {
      /* browser blocked audio */
    }
  };

  const { out: assistantText, talking } = useTypewriter(sectionCopy[active], soundEnabled, beep);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((v) => v + 1), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const current = todayISO();
    if (state.lastOpenDate !== current) {
      setState((prev) => ({ ...prev, lastOpenDate: current }));
    }
  }, []);

  const sendBotEvent = async (path: string, body: Record<string, unknown>) => {
    if (!state.botApiUrl) return;
    try {
      await fetch(`${state.botApiUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(state.botApiKey ? { "x-api-key": state.botApiKey } : {})
        },
        body: JSON.stringify(body)
      });
    } catch {
      console.warn("Bot API недоступен");
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const soon = state.tasks.find((task) => {
        if (!task.reminder || task.done || task.notified || !task.date || !task.time) return false;
        const deadline = new Date(`${task.date}T${task.time}`).getTime();
        const diff = deadline - Date.now();
        return diff > 0 && diff <= 2 * 60 * 60 * 1000;
      });
      if (soon) {
        const hours = Math.max(1, Math.ceil((new Date(`${soon.date}T${soon.time}`).getTime() - Date.now()) / 36e5));
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((task) => (task.id === soon.id ? { ...task, notified: true } : task))
        }));
        notifySound();
        sendBotEvent("/event/task", {
          title: soon.title,
          date: soon.date,
          time: soon.time,
          hours_left: hours
        });
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [state.tasks, state.botApiUrl, state.botApiKey]);

  const todayTasks = state.tasks.filter((task) => task.date === todayISO());
  const selectedTasks = state.tasks.filter((task) => task.date === selectedDate);
  const completedToday = todayTasks.filter((task) => task.done).length;
  const dayPercent = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const habitPercent = state.habits.length
    ? Math.round((state.habits.filter((habit) => habit.days.includes(todayISO())).length / state.habits.length) * 100)
    : 0;
  const balance = state.operations.reduce((sum, op) => sum + (op.type === "income" ? op.amount : -op.amount), 0);
  const income = state.operations.filter((op) => op.type === "income").reduce((sum, op) => sum + op.amount, 0);
  const expense = state.operations.filter((op) => op.type === "expense").reduce((sum, op) => sum + op.amount, 0);
  const spendLimit = Math.max(0, balance * 0.5);
  const bestGoalProgress = state.goals.length
    ? Math.round(state.goals.reduce((sum, goal) => sum + Math.min(100, (goal.saved / goal.target) * 100), 0) / state.goals.length)
    : 0;
  const globalScore = Math.round((dayPercent + habitPercent + Math.min(100, bestGoalProgress)) / 3);
  const monthDays = getMonthDays(viewMonth);

  const update = (patch: Partial<AppState>) => setState((prev) => ({ ...prev, ...patch }));

  const addTask = (date = todayISO()) => {
    const title = prompt("Название задачи:");
    if (!title) return;
    const time = prompt("Время дедлайна, например 18:30:", nowTime()) || "";
    const task: Task = {
      id: uid(),
      title,
      date,
      time,
      priority: "medium",
      done: false,
      reminder: true,
      createdAt: new Date().toISOString()
    };
    update({ tasks: [task, ...state.tasks] });
  };

  const editTask = (task: Task) => {
    const title = prompt("Новое название:", task.title);
    if (!title) return;
    const time = prompt("Время:", task.time) || task.time;
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((item) => (item.id === task.id ? { ...item, title, time, notified: false } : item))
    }));
  };

  const addProject = () => {
    const title = prompt("Название проекта:");
    if (!title) return;
    const project: Project = {
      id: uid(),
      title,
      description: prompt("Описание проекта:", "Короткое описание") || "",
      deadline: prompt("Дедлайн YYYY-MM-DD:", todayISO()) || todayISO(),
      status: "new",
      createdAt: new Date().toISOString()
    };
    update({ projects: [project, ...state.projects] });
  };

  const addFinance = (type: "income" | "expense") => {
    const raw = prompt(type === "income" ? "Сумма пополнения:" : "Сумма расхода:");
    const amount = Number(raw);
    if (!amount || amount <= 0) return;
    const operation: FinanceOperation = {
      id: uid(),
      type,
      amount,
      category: prompt("Категория:", type === "income" ? "Доход" : "Расход") || "",
      note: prompt("Комментарий:", "") || "",
      createdAt: new Date().toISOString()
    };
    const nextOps = [operation, ...state.operations];
    update({ operations: nextOps });
    const nextBalance = nextOps.reduce((sum, op) => sum + (op.type === "income" ? op.amount : -op.amount), 0);
    if (type === "income") {
      notifySound();
      sendBotEvent("/event/balance", {
        amount,
        balance: nextBalance,
        category: operation.category,
        note: operation.note
      });
    }
  };

  const addGoal = () => {
    const title = prompt("Название цели:");
    if (!title) return;
    const target = Number(prompt("Сколько нужно накопить?"));
    if (!target || target <= 0) return;
    const goal: FinanceGoal = {
      id: uid(),
      title,
      target,
      saved: Number(prompt("Сколько уже есть?", "0")) || 0,
      deadline: prompt("Дедлайн YYYY-MM-DD:", "") || ""
    };
    update({ goals: [goal, ...state.goals] });
  };

  const addHabit = () => {
    const title = prompt("Название привычки:");
    if (!title) return;
    update({ habits: [{ id: uid(), title, days: [] }, ...state.habits] });
  };

  const projectPercent = (projectId: string) => {
    const tasks = state.tasks.filter((task) => task.projectId === projectId);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100);
  };

  const spendAdvice = useMemo(() => {
    if (!adviceAmount) return "Введи сумму покупки — дельфин скажет, стоит ли тратить.";
    const after = balance - adviceAmount;
    const isDanger = adviceAmount > spendLimit;
    const goalDebt = state.goals.reduce((sum, goal) => sum + Math.max(0, goal.target - goal.saved), 0);
    if (isDanger) {
      return `Лучше не тратить на "${adviceName || "покупку"}". Это больше 50% баланса. После траты останется ${formatMoney(after)}. До целей ещё ${formatMoney(goalDebt)}.`;
    }
    return `Можно потратить, но спокойно. После покупки останется ${formatMoney(after)}. Лимит безопасной траты сейчас: ${formatMoney(spendLimit)}.`;
  }, [adviceAmount, adviceName, balance, spendLimit, state.goals]);

  return (
    <div className="app" onClick={() => audioCtx.current?.resume?.()}>
      <div className="stars" />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><MoonStar size={20} /></div>
          <div>
            <b>Jedi Focus</b>
            <span>pixel AI office</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => setActive(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="side-card">
          <Waves size={20} />
          <p>Звук дельфина и уведомлений</p>
          <button className="mini-btn" onClick={() => { setSoundEnabled(!soundEnabled); beep(); }}>
            {soundEnabled ? "Выключить" : "Включить"}
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Jedi productivity system</span>
            <h1>Личный пиксельный офис для фокуса, задач и денег</h1>
            <p>Задачи, календарь, проекты, финансы, цели, привычки и отчёт дня в одном игровом интерфейсе.</p>
            <div className="hero-actions">
              <button className="primary" onClick={() => addTask()}><Plus size={18} /> Добавить задачу</button>
              <button className="ghost" onClick={() => setActive("stats")}><Sparkles size={18} /> Смотреть отчёт</button>
            </div>
          </div>
          <div className="assistant-card">
            <PixelDolphin talking={talking} />
            <div className="speech">
              <b>Дельфин-джедай</b>
              <p>{assistantText}<span className="cursor">|</span></p>
            </div>
          </div>
        </header>

        {active === "home" && (
          <section className="grid home-grid">
            <MetricCard title="Баланс" value={formatMoney(balance)} icon={CircleDollarSign} />
            <MetricCard title="Фокус дня" value={state.focus || "не выбран"} icon={Rocket} />
            <MetricCard title="Задачи сегодня" value={`${completedToday}/${todayTasks.length}`} icon={CheckCircle2} />
            <MetricCard title="Привычки" value={`${habitPercent}%`} icon={Flame} />
            <div className="panel wide">
              <div className="panel-head">
                <h2>Главный фокус дня</h2>
                <button className="mini-btn" onClick={() => update({ focus: prompt("Фокус дня:", state.focus) || state.focus })}>
                  <Pencil size={15} /> Изменить
                </button>
              </div>
              <div className="focus-banner">
                <Rocket size={28} />
                <div>
                  <b>{state.focus}</b>
                  <p>Дельфин будет напоминать тебе про это в течение дня.</p>
                </div>
              </div>
            </div>
            <ProgressPanel percent={globalScore} title="Сила дня" />
          </section>
        )}

        {active === "tasks" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Задачи дня</h2>
                <p>В 00:00 открывается новый день. Старые задачи остаются в календаре и истории.</p>
              </div>
              <button className="primary" onClick={() => addTask()}><Plus size={18} /> Добавить</button>
            </div>
            <TaskList
              tasks={todayTasks}
              projects={state.projects}
              tick={tick}
              onToggle={(id) => setState((prev) => ({ ...prev, tasks: prev.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }))}
              onEdit={editTask}
              onDelete={(id) => update({ tasks: state.tasks.filter((task) => task.id !== id) })}
              onMoveTomorrow={(id) => {
                const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
                setState((prev) => ({ ...prev, tasks: prev.tasks.map((task) => task.id === id ? { ...task, date: tomorrow, notified: false } : task) }));
              }}
            />
          </section>
        )}

        {active === "calendar" && (
          <section className="grid calendar-layout">
            <div className="panel">
              <div className="panel-head">
                <button className="mini-btn" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}>←</button>
                <h2>{viewMonth.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</h2>
                <button className="mini-btn" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}>→</button>
              </div>
              <div className="week-row">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <span key={d}>{d}</span>)}</div>
              <div className="calendar-grid">
                {monthDays.map((day, index) => {
                  const count = day ? state.tasks.filter((task) => task.date === day).length : 0;
                  return (
                    <button
                      key={`${day}-${index}`}
                      disabled={!day}
                      className={`${day === selectedDate ? "selected" : ""} ${day === todayISO() ? "today" : ""}`}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day ? Number(day.slice(-2)) : ""}
                      {count > 0 && <i>{count}</i>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>{selectedDate}</h2>
                <button className="primary" onClick={() => addTask(selectedDate)}><Plus size={18} /> В дату</button>
              </div>
              <TaskList
                tasks={selectedTasks}
                projects={state.projects}
                tick={tick}
                onToggle={(id) => setState((prev) => ({ ...prev, tasks: prev.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }))}
                onEdit={editTask}
                onDelete={(id) => update({ tasks: state.tasks.filter((task) => task.id !== id) })}
                onMoveTomorrow={() => {}}
              />
            </div>
          </section>
        )}

        {active === "projects" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Проекты</h2>
                <p>Карточки с дедлайнами, статусом и процентом выполнения.</p>
              </div>
              <button className="primary" onClick={addProject}><Plus size={18} /> Проект</button>
            </div>
            <div className="cards">
              {state.projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="project-top">
                    <span className={`status ${project.status}`}>{statusLabel(project.status)}</span>
                    <button className="icon-btn" onClick={() => update({ projects: state.projects.filter((p) => p.id !== project.id) })}><Trash2 size={15} /></button>
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="project-meta">
                    <span><Clock size={14} /> {project.deadline}</span>
                    <span>{projectPercent(project.id)}%</span>
                  </div>
                  <div className="bar"><i style={{ width: `${projectPercent(project.id)}%` }} /></div>
                  <select
                    value={project.status}
                    onChange={(e) => setState((prev) => ({
                      ...prev,
                      projects: prev.projects.map((p) => p.id === project.id ? { ...p, status: e.target.value as ProjectStatus } : p)
                    }))}
                  >
                    <option value="new">новый</option>
                    <option value="work">в работе</option>
                    <option value="almost">почти готов</option>
                    <option value="done">завершён</option>
                  </select>
                </article>
              ))}
            </div>
          </section>
        )}

        {active === "finance" && (
          <section className="grid finance-grid">
            <div className="panel">
              <div className="panel-head">
                <h2>Финансы</h2>
                <div className="row">
                  <button className="primary" onClick={() => addFinance("income")}>+ Доход</button>
                  <button className="ghost" onClick={() => addFinance("expense")}>− Расход</button>
                </div>
              </div>
              <div className="money-main">{formatMoney(balance)}</div>
              <div className="money-row">
                <span>Доходы: <b>{formatMoney(income)}</b></span>
                <span>Расходы: <b>{formatMoney(expense)}</b></span>
                <span>Можно тратить: <b>{formatMoney(spendLimit)}</b></span>
              </div>
              <div className="ops">
                {state.operations.slice(0, 8).map((op) => (
                  <div className="op" key={op.id}>
                    <span className={op.type}>{op.type === "income" ? "+" : "-"}{formatMoney(op.amount)}</span>
                    <small>{op.category} · {op.note || "без комментария"}</small>
                    <button className="icon-btn" onClick={() => update({ operations: state.operations.filter((item) => item.id !== op.id) })}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <h2>Умный советник трат</h2>
              <p>Правило MVP: если покупка больше 50% баланса — лучше не тратить.</p>
              <input value={adviceName} onChange={(e) => setAdviceName(e.target.value)} placeholder="На что хочешь потратить?" />
              <input type="number" value={adviceAmount || ""} onChange={(e) => setAdviceAmount(Number(e.target.value))} placeholder="Сумма" />
              <div className={`advice ${adviceAmount > spendLimit ? "danger" : "ok"}`}>{spendAdvice}</div>
              <div className="command-box">Команда бота: <b>/balik</b> покажет баланс, доходы, расходы и лимит трат.</div>
            </div>
          </section>
        )}

        {active === "goals" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Финансовые цели</h2>
                <p>Добавь цель, сумму и отслеживай сколько осталось накопить.</p>
              </div>
              <button className="primary" onClick={addGoal}><Plus size={18} /> Цель</button>
            </div>
            <div className="cards">
              {state.goals.map((goal) => {
                const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
                return (
                  <article className="project-card goal-card" key={goal.id}>
                    <div className="project-top">
                      <span className="status work">{percent}%</span>
                      <button className="icon-btn" onClick={() => update({ goals: state.goals.filter((g) => g.id !== goal.id) })}><Trash2 size={15} /></button>
                    </div>
                    <h3>{goal.title}</h3>
                    <p>Накоплено {formatMoney(goal.saved)} из {formatMoney(goal.target)}</p>
                    <div className="bar"><i style={{ width: `${percent}%` }} /></div>
                    <p>Осталось: <b>{formatMoney(Math.max(0, goal.target - goal.saved))}</b></p>
                    <button className="mini-btn" onClick={() => {
                      const add = Number(prompt("Добавить к цели:", "1000"));
                      if (!add) return;
                      setState((prev) => ({
                        ...prev,
                        goals: prev.goals.map((g) => g.id === goal.id ? { ...g, saved: g.saved + add } : g)
                      }));
                    }}>Пополнить цель</button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {active === "habits" && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Трекер привычек</h2>
                <p>Отмечай каждый день и собирай серию.</p>
              </div>
              <button className="primary" onClick={addHabit}><Plus size={18} /> Привычка</button>
            </div>
            <div className="habit-list">
              {state.habits.map((habit) => {
                const done = habit.days.includes(todayISO());
                return (
                  <div className="habit" key={habit.id}>
                    <button className={done ? "checked" : ""} onClick={() => {
                      setState((prev) => ({
                        ...prev,
                        habits: prev.habits.map((h) => {
                          if (h.id !== habit.id) return h;
                          const has = h.days.includes(todayISO());
                          return { ...h, days: has ? h.days.filter((d) => d !== todayISO()) : [...h.days, todayISO()] };
                        })
                      }));
                      notifySound();
                    }}>{done ? "✓" : ""}</button>
                    <div>
                      <b>{habit.title}</b>
                      <small>Серия: {habit.days.length} дней</small>
                    </div>
                    <div className="habit-grid">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
                        return <i key={d} className={habit.days.includes(d) ? "on" : ""} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {active === "stats" && (
          <section className="grid stats-layout">
            <ProgressPanel percent={globalScore} title="Главный отчёт дня" big />
            <div className="panel">
              <h2>Статистика дня</h2>
              <div className="stat-lines">
                <p><CheckCircle2 size={18} /> Задачи выполнено: <b>{completedToday}/{todayTasks.length}</b></p>
                <p><Bell size={18} /> Просрочено: <b>{todayTasks.filter((task) => !task.done && task.time && new Date(`${task.date}T${task.time}`) < new Date()).length}</b></p>
                <p><Rocket size={18} /> Фокус дня: <b>{state.focus}</b></p>
                <p><Flame size={18} /> Привычки: <b>{habitPercent}%</b></p>
                <p><CircleDollarSign size={18} /> Баланс: <b>{formatMoney(balance)}</b></p>
                <p><Goal size={18} /> Цели: <b>{bestGoalProgress}%</b></p>
              </div>
              <div className="income-target">
                <h3>Желаемый доход</h3>
                <input type="number" value={state.desiredIncome || ""} onChange={(e) => update({ desiredIncome: Number(e.target.value) })} />
                <p>Нужно в день: <b>{formatMoney(state.desiredIncome / 30)}</b></p>
                <p>Уже получено: <b>{formatMoney(income)}</b></p>
                <p>Осталось: <b>{formatMoney(Math.max(0, state.desiredIncome - income))}</b></p>
              </div>
            </div>
          </section>
        )}

        {active === "settings" && (
          <section className="panel settings-panel">
            <h2>Telegram-бот и 24/7 уведомления</h2>
            <p>Для демо сайт хранит данные в localStorage. Для настоящих уведомлений 24/7 запусти папку <b>/bot</b> на Railway, Render или VPS и вставь URL ниже.</p>
            <label>Bot API URL</label>
            <input value={state.botApiUrl} onChange={(e) => update({ botApiUrl: e.target.value })} placeholder="https://your-bot-service.onrender.com" />
            <label>API key, если включишь защиту</label>
            <input value={state.botApiKey} onChange={(e) => update({ botApiKey: e.target.value })} placeholder="можно оставить пустым" />
            <div className="command-grid">
              {["/start", "/balik", "/today", "/focus", "/stats", "/goals"].map((cmd) => <code key={cmd}>{cmd}</code>)}
            </div>
            <button className="primary" onClick={() => sendBotEvent("/notify", { message: "Тестовое уведомление из Jedi Focus Dashboard" })}>Отправить тест в Telegram</button>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return <button key={item.key} className={active === item.key ? "active" : ""} onClick={() => setActive(item.key)}><Icon size={18} /><span>{item.label}</span></button>;
        })}
      </nav>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string; icon: ElementType }) {
  return (
    <article className="metric">
      <Icon size={22} />
      <span>{title}</span>
      <b>{value}</b>
    </article>
  );
}

function ProgressPanel({ percent, title, big }: { percent: number; title: string; big?: boolean }) {
  const tone = percent < 40 ? "low" : percent < 75 ? "mid" : "high";
  return (
    <div className={`panel progress-panel ${big ? "big" : ""}`}>
      <h2>{title}</h2>
      <div className={`progress-ring ${tone}`} style={{ ["--p" as string]: `${percent}%` }}>
        <div>
          <b>{percent}%</b>
          <span>выполнено</span>
        </div>
      </div>
      <p>{percent < 40 ? "День можно спасти: выбери одну задачу и закрой её." : percent < 75 ? "Нормальный темп. Ещё один рывок — и день сильный." : "Красиво. Фокус держится как у джедая."}</p>
    </div>
  );
}

function TaskList({
  tasks,
  projects,
  tick,
  onToggle,
  onEdit,
  onDelete,
  onMoveTomorrow
}: {
  tasks: Task[];
  projects: Project[];
  tick: number;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onMoveTomorrow: (id: string) => void;
}) {
  if (!tasks.length) return <div className="empty"><Leaf size={24} /> На эту дату задач нет. Добавь первую.</div>;
  return (
    <div className="task-list" data-tick={tick}>
      {tasks.map((task) => {
        const project = projects.find((p) => p.id === task.projectId);
        const overdue = task.time && new Date(`${task.date}T${task.time}`) < new Date() && !task.done;
        return (
          <article className={`task ${task.done ? "done" : ""} ${overdue ? "overdue" : ""}`} key={task.id}>
            <button className="check" onClick={() => onToggle(task.id)}>{task.done ? "✓" : ""}</button>
            <div className="task-body">
              <b>{task.title}</b>
              <small>
                <Clock size={13} /> {task.time || "без времени"} · {deadlineText(task)} · <span className={`prio ${task.priority}`}>{task.priority}</span>
                {project && <> · {project.title}</>}
              </small>
            </div>
            {task.reminder && <Bell className="bell" size={17} />}
            <button className="icon-btn" onClick={() => onEdit(task)}><Pencil size={15} /></button>
            <button className="icon-btn" onClick={() => onMoveTomorrow(task.id)}>↗</button>
            <button className="icon-btn" onClick={() => onDelete(task.id)}><Trash2 size={15} /></button>
          </article>
        );
      })}
    </div>
  );
}

function statusLabel(status: ProjectStatus) {
  return {
    new: "новый",
    work: "в работе",
    almost: "почти готов",
    done: "завершён"
  }[status];
}

export default App;

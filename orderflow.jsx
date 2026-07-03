import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  LayoutDashboard, ListOrdered, Settings2, Bell, BarChart3, ScrollText, Settings as SettingsIcon,
  Plus, Trash2, Edit2, Check, AlertTriangle, Search, Download, RefreshCw, Store as StoreIcon,
  ArrowLeft, CheckCircle2, XCircle, Loader2, User, Clock, X, Menu, Package, Send, ChevronDown,
  ChevronRight, Sparkles, Truck, Tag as TagIcon, History, MapPin, Phone, Mail, Filter, ArrowUpDown
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import * as XLSX from "xlsx";

/* ============================== DESIGN TOKENS (раздел 7 ТЗ) ============================== */
const C = {
  primary: "#5B4FE8", primaryHover: "#4A3FD0", success: "#16A34A", warning: "#F59E0B",
  danger: "#DC2626", bg: "#F7F8FA", surface: "#FFFFFF", border: "#E5E7EB",
  text: "#1A1A2E", textMuted: "#6B7280", blue: "#2563EB",
};

const STATUS_META = {
  new: { label: "Новый", color: "#6B7280", bg: "#F3F4F6" },
  review: { label: "Требует проверки", color: "#B45309", bg: "#FEF3C7" },
  processing: { label: "В обработке", color: C.primary, bg: "#EDE9FE" },
  shipped: { label: "Отправлен", color: C.blue, bg: "#DBEAFE" },
  done: { label: "Выполнен", color: C.success, bg: "#DCFCE7" },
  error: { label: "Ошибка", color: C.danger, bg: "#FEE2E2" },
};

/* ============================== ДЕМО-ДАННЫЕ ============================== */
const NAMES = ["Иван Петров","Мария Смирнова","Алексей Кузнецов","Елена Соколова","Дмитрий Попов","Ольга Лебедева","Сергей Новиков","Наталья Морозова","Андрей Волков","Татьяна Алексеева","Павел Егоров","Юлия Козлова","Максим Фёдоров","Анна Виноградова"];
const CITIES = ["Москва","Санкт-Петербург","Новосибирск","Екатеринбург","Казань","Нижний Новгород","Челябинск","Самара","Ростов-на-Дону","Уфа"];
const STREETS = ["Ленина","Мира","Гагарина","Советская","Садовая","Пушкина","Молодёжная"];
const ITEMS_POOL = [
  { name: "Футболка базовая", price: 1200 }, { name: "Кроссовки Runner", price: 4500 },
  { name: "Куртка-ветровка", price: 6800 }, { name: "Рюкзак городской", price: 3200 },
  { name: "Кепка бейсболка", price: 900 }, { name: "Носки, набор 3 пары", price: 600 },
  { name: "Худи оверсайз", price: 3900 }, { name: "Джинсы slim", price: 3500 },
  { name: "Шарф вязаный", price: 1400 }, { name: "Перчатки кожаные", price: 2100 },
];
const SOURCES = ["tilda", "wix"];
const PAYMENTS = ["card", "cash", "online"];
const PAYMENT_LABEL = { card: "Карта", cash: "Наличные", online: "Онлайн" };
const DELIVERY_SERVICES = ["СДЭК", "Почта России", "Boxberry", "Курьер"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function uid(prefix) { return prefix + "-" + Math.random().toString(36).slice(2, 8); }

function formatMoney(n) {
  return (n || 0).toLocaleString("ru-RU") + " ₽";
}
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function isSameDay(iso, ref) {
  const d = new Date(iso), r = ref || new Date();
  return d.toDateString() === r.toDateString();
}

function makeLog(actor, action) {
  return { id: uid("LG"), ts: new Date().toISOString(), actor, action };
}

function generateOrder(existingOrders, counterRef) {
  counterRef.current += 1;
  const forceIncomplete = Math.random() < 1 / 8;
  const name = pick(NAMES);
  const missCity = forceIncomplete && Math.random() < 0.5;
  const missAddress = forceIncomplete && !missCity;
  const city = missCity ? "" : pick(CITIES);
  const address = missAddress ? "" : `ул. ${pick(STREETS)}, д. ${randInt(1, 120)}`;
  const itemsCount = randInt(1, 3);
  const items = Array.from({ length: itemsCount }).map(() => {
    const it = pick(ITEMS_POOL);
    return { name: it.name, qty: randInt(1, 2), price: it.price };
  });
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  let phone = `+7 9${randInt(10, 99)} ${randInt(100, 999)}-${randInt(10, 99)}-${randInt(10, 99)}`;
  let finalTotal = total;

  // ~1 из 10 — дубликат недавнего заказа (тот же телефон и сумма)
  const canDup = existingOrders.length > 0 && !forceIncomplete && Math.random() < 0.12;
  if (canDup) {
    const src = existingOrders[existingOrders.length - 1];
    phone = src.customer.phone;
    finalTotal = src.total;
  }

  return {
    id: "ORD-" + (1000 + counterRef.current),
    source: pick(SOURCES),
    createdAt: new Date().toISOString(),
    customer: {
      name, phone,
      email: name.toLowerCase().replace(/\s+/g, ".").replace(/[йцукенгшщзхъфывапролджэячсмитьбю]/g, (c) => c) + "@mail.ru",
      city, address,
    },
    items, total: finalTotal, paymentMethod: pick(PAYMENTS),
    status: "new",
    validation: { valid: true, issues: [] },
    deliveryService: null, tags: [], priority: "normal",
    notifications: [],
    log: [makeLog("bot", "Заказ создан")],
  };
}

function validateOrder(order, allOrders) {
  const issues = [];
  if (!order.customer.name) issues.push("Не указано имя клиента");
  if (!order.customer.phone || !/^\+7/.test(order.customer.phone)) issues.push("Некорректный телефон");
  if (!order.customer.city) issues.push("Не указан город");
  if (!order.customer.address) issues.push("Не указан адрес");
  if (!order.items || !order.items.length) issues.push("Не указаны товары");
  if (!order.total || order.total <= 0) issues.push("Некорректная сумма заказа");
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  const dup = allOrders.some(
    (o) => o.id !== order.id && o.customer.phone === order.customer.phone &&
      o.total === order.total && new Date(o.createdAt).getTime() > tenMinAgo
  );
  if (dup) issues.push("Возможный дубликат заказа");
  return { valid: issues.length === 0, issues };
}

function getFieldValue(order, field) {
  switch (field) {
    case "city": return order.customer.city;
    case "total": return order.total;
    case "item": return order.items.map((i) => i.name).join(", ");
    case "source": return order.source;
    case "payment": return order.paymentMethod;
    default: return "";
  }
}
function matchCondition(order, cond) {
  const v = getFieldValue(order, cond.field);
  const target = cond.value;
  switch (cond.operator) {
    case "eq": return String(v).toLowerCase() === String(target).toLowerCase();
    case "neq": return String(v).toLowerCase() !== String(target).toLowerCase();
    case "gt": return Number(v) > Number(target);
    case "lt": return Number(v) < Number(target);
    case "contains": return String(v).toLowerCase().includes(String(target).toLowerCase());
    default: return false;
  }
}
function applyAction(order, action, templates) {
  const next = { ...order, tags: [...order.tags] };
  switch (action.type) {
    case "assign_delivery": next.deliveryService = action.params.service; break;
    case "add_tag": if (!next.tags.includes(action.params.tag)) next.tags.push(action.params.tag); break;
    case "set_priority": next.priority = action.params.priority; break;
    case "set_status": next.status = action.params.status; break;
    case "send_template": next._sendStatus = action.params.status; break;
    default: break;
  }
  return next;
}

function renderTemplateText(text, order) {
  return text
    .replace(/\{name\}/g, order.customer.name || "клиент")
    .replace(/\{order_id\}/g, order.id)
    .replace(/\{sum\}/g, formatMoney(order.total))
    .replace(/\{status\}/g, STATUS_META[order.status]?.label || order.status);
}

/* ============================== СТАРТОВЫЕ ДАННЫЕ ============================== */
function defaultRules() {
  return [
    { id: uid("RL"), name: "Москва → СДЭК", enabled: true, condition: { field: "city", operator: "eq", value: "Москва" }, action: { type: "assign_delivery", params: { service: "СДЭК" } } },
    { id: uid("RL"), name: "VIP по сумме", enabled: true, condition: { field: "total", operator: "gt", value: "5000" }, action: { type: "add_tag", params: { tag: "VIP" } } },
    { id: uid("RL"), name: "Уведомление о новом заказе", enabled: true, condition: { field: "total", operator: "gt", value: "0" }, action: { type: "send_template", params: { status: "processing" } } },
  ];
}
function defaultTemplates() {
  return [
    { id: uid("TP"), status: "new", channel: "telegram", text: "Здравствуйте, {name}! Ваш заказ {order_id} на сумму {sum} принят.", enabled: true },
    { id: uid("TP"), status: "processing", channel: "telegram", text: "{name}, заказ {order_id} обрабатывается. Сумма: {sum}.", enabled: true },
    { id: uid("TP"), status: "shipped", channel: "sms", text: "Ваш заказ {order_id} отправлен! Ожидайте доставку.", enabled: true },
    { id: uid("TP"), status: "done", channel: "email", text: "{name}, спасибо за покупку! Заказ {order_id} выполнен.", enabled: true },
  ];
}
function defaultUser() {
  return { id: uid("US"), name: "Владимир Соколов", email: "vladimir@myshop.ru", tariff: "business" };
}

/* ============================== МЕЛКИЕ UI-КОМПОНЕНТЫ ============================== */
function Button({ children, variant = "primary", size = "md", loading, disabled, className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "text-sm px-3 py-1.5" : "text-sm px-4 py-2.5";
  const styles = {
    primary: { background: C.primary, color: "#fff" },
    secondary: { background: "#fff", color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.text },
    danger: { background: "#fff", color: C.danger, border: `1px solid ${C.danger}` },
  }[variant];
  return (
    <button
      style={styles}
      className={`${base} ${sizes} ${className}`}
      disabled={disabled || loading}
      onMouseEnter={(e) => { if (variant === "primary" && !disabled) e.currentTarget.style.background = C.primaryHover; }}
      onMouseLeave={(e) => { if (variant === "primary" && !disabled) e.currentTarget.style.background = C.primary; }}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

function Badge({ color, bg, children, icon }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color, background: bg }}>
      {icon}{children}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return <Badge color={m.color} bg={m.bg}>{m.label}</Badge>;
}

function Card({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-xl bg-white ${className}`} style={{ border: `1px solid ${C.border}`, boxShadow: "0 1px 2px rgba(16,24,40,0.04)", ...style }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <Card className="p-4 flex items-start justify-between">
      <div>
        <div className="text-xs font-medium" style={{ color: C.textMuted }}>{label}</div>
        <div className="mt-1 font-bold" style={{ fontSize: 28, color: C.text }}>{value}</div>
      </div>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: accent + "1A", color: accent }}>
        {icon}
      </div>
    </Card>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-xs font-semibold mb-1" style={{ color: C.text }}>{label}</div>}
      <input
        {...props}
        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
        style={{ border: `1px solid ${error ? C.danger : C.border}`, background: "#fff", color: C.text }}
        onFocus={(e) => (e.target.style.borderColor = C.primary)}
        onBlur={(e) => (e.target.style.borderColor = error ? C.danger : C.border)}
      />
      {error && <div className="text-xs mt-1" style={{ color: C.danger }}>{error}</div>}
    </label>
  );
}

function Select({ label, className = "", children, ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="text-xs font-semibold mb-1" style={{ color: C.text }}>{label}</div>}
      <select {...props} className="w-full px-3 py-2 rounded-lg text-sm bg-white focus:outline-none" style={{ border: `1px solid ${C.border}`, color: C.text }}>
        {children}
      </select>
    </label>
  );
}

function Switch({ checked, onChange, labelOn = "Включено", labelOff = "Выключено", showLabel = true }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 focus:outline-none"
      aria-pressed={checked}
      aria-label={checked ? labelOn : labelOff}
    >
      <span className="w-10 h-6 rounded-full relative transition-colors" style={{ background: checked ? C.primary : "#D1D5DB" }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow" style={{ left: checked ? 18 : 2 }} />
      </span>
      {showLabel && <span className="text-sm font-medium" style={{ color: checked ? C.primary : C.textMuted }}>{checked ? labelOn : labelOff}</span>}
    </button>
  );
}

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "#EDE9FE", color: C.primary }}>{icon}</div>
      <div className="font-semibold" style={{ color: C.text }}>{title}</div>
      {subtitle && <div className="text-sm mt-1 max-w-sm" style={{ color: C.textMuted }}>{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(17,17,27,0.5)" }} onClick={onClose}>
      <div className="rounded-xl bg-white w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="font-semibold" style={{ color: C.text, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} aria-label="Закрыть" className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, title, children, width = 560 }) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
      <div className="absolute inset-0 transition-opacity" style={{ background: "rgba(17,17,27,0.5)", opacity: open ? 1 : 0 }} onClick={onClose} />
      <div
        className="absolute right-0 top-0 h-full bg-white shadow-2xl transition-transform overflow-y-auto"
        style={{ width: "100%", maxWidth: width, transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-white z-10" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="font-semibold" style={{ color: C.text, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} aria-label="Закрыть" className="p-1 rounded hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <p className="text-sm mb-5" style={{ color: C.textMuted }}>{description}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={() => { onConfirm(); onClose(); }}>Подтвердить</Button>
      </div>
    </Modal>
  );
}

/* Toasts */
function ToastHost({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]">
      {toasts.map((t) => (
        <div key={t.id} className="rounded-lg px-4 py-3 shadow-lg flex items-start gap-2 text-sm animate-[fadein_0.2s]"
          style={{ background: "#fff", border: `1px solid ${C.border}`, borderLeft: `4px solid ${t.type === "error" ? C.danger : t.type === "info" ? C.blue : C.success}` }}>
          {t.type === "error" ? <XCircle size={16} color={C.danger} className="mt-0.5 shrink-0" /> : t.type === "info" ? <Bell size={16} color={C.blue} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} color={C.success} className="mt-0.5 shrink-0" />}
          <span style={{ color: C.text }}>{t.msg}</span>
          <button onClick={() => remove(t.id)} className="ml-auto shrink-0"><X size={14} color={C.textMuted} /></button>
        </div>
      ))}
    </div>
  );
}

/* ============================== НАВИГАЦИЯ ============================== */
const NAV = [
  { key: "dashboard", label: "Дашборд", icon: LayoutDashboard },
  { key: "orders", label: "Заказы", icon: ListOrdered },
  { key: "rules", label: "Правила", icon: Settings2 },
  { key: "notifications", label: "Уведомления", icon: Bell },
  { key: "reports", label: "Отчёты", icon: BarChart3 },
  { key: "log", label: "Журнал", icon: ScrollText },
  { key: "settings", label: "Настройки", icon: SettingsIcon },
];

function Sidebar({ page, setPage, mobileOpen, setMobileOpen }) {
  return (
    <>
      <div className={`fixed inset-0 bg-black/40 z-40 md:hidden ${mobileOpen ? "" : "hidden"}`} onClick={() => setMobileOpen(false)} />
      <div
        className={`fixed md:static z-50 md:z-auto top-0 left-0 h-full flex flex-col transition-transform md:translate-x-0`}
        style={{ width: 240, background: "#151321", transform: mobileOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.primary }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div className="text-white font-bold text-[15px]">OrderFlow AI</div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = page === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setPage(item.key); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: active ? C.primary : "transparent", color: active ? "#fff" : "#B4B0C9" }}
              >
                <Icon size={17} />{item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-xs" style={{ color: "#6B6785" }}>Прототип · демо-данные</div>
      </div>
      {/* делаем сайдбар видимым на десктопе всегда */}
      <style>{`@media (min-width: 768px) { .of-sidebar-force { transform: translateX(0) !important; } }`}</style>
    </>
  );
}

function Topbar({ title, botActive, setBotActive, setMobileOpen, user }) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-white" style={{ borderBottom: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-3">
        <button className="md:hidden p-1.5 rounded hover:bg-gray-100" onClick={() => setMobileOpen(true)} aria-label="Меню">
          <Menu size={20} />
        </button>
        <div className="font-semibold" style={{ fontSize: 18, color: C.text }}>{title}</div>
      </div>
      <div className="flex items-center gap-4">
        <Switch checked={botActive} onChange={setBotActive} labelOn="Бот активен" labelOff="Бот выключен" />
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: C.primary, color: "#fff" }} title={user.name}>
          {user.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
        </div>
      </div>
    </div>
  );
}

/* ============================== ONBOARDING ============================== */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const connect = () => {
    setConnecting(true);
    setTimeout(() => { setConnecting(false); setStep(3); }, 1400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: C.bg }}>
      <Card className="w-full max-w-lg p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.primary }}><Sparkles size={20} color="#fff" /></div>
          <div className="font-bold" style={{ fontSize: 18, color: C.text }}>OrderFlow AI</div>
        </div>
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: step >= s ? C.primary : "#F3F4F6", color: step >= s ? "#fff" : C.textMuted }}>{s}</div>
              {s < 3 && <div className="flex-1 h-0.5" style={{ background: step > s ? C.primary : C.border }} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="font-semibold mb-1" style={{ fontSize: 16 }}>Выберите конструктор сайта</div>
            <p className="text-sm mb-5" style={{ color: C.textMuted }}>Мы подключимся к вашему магазину и начнём собирать заказы автоматически.</p>
            <div className="grid grid-cols-2 gap-3">
              {["tilda", "wix"].map((p) => (
                <button key={p} onClick={() => setPlatform(p)}
                  className="rounded-xl p-4 text-left transition-colors"
                  style={{ border: `2px solid ${platform === p ? C.primary : C.border}`, background: platform === p ? "#EDE9FE" : "#fff" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: C.primary + "22", color: C.primary }}><StoreIcon size={18} /></div>
                  <div className="font-semibold capitalize" style={{ color: C.text }}>{p === "tilda" ? "Tilda" : "Wix"}</div>
                  <div className="text-xs mt-1" style={{ color: C.textMuted }}>{p === "tilda" ? "Конструктор сайтов и лендингов" : "Универсальный конструктор сайтов"}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button disabled={!platform} onClick={() => setStep(2)}>Далее<ChevronRight size={16} /></Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="font-semibold mb-1" style={{ fontSize: 16 }}>Подключение {platform === "tilda" ? "Tilda" : "Wix"}</div>
            <p className="text-sm mb-5" style={{ color: C.textMuted }}>Введите API-ключ вашего магазина, чтобы разрешить чтение заказов.</p>
            <Input label="API-ключ" placeholder="sk-demo-xxxxxxxxxxxx" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <div className="text-xs mt-2" style={{ color: C.primary }} title="В личном кабинете конструктора: Настройки → API → Создать ключ">Где взять ключ?</div>
            <div className="mt-6 flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}><ArrowLeft size={16} />Назад</Button>
              <Button loading={connecting} disabled={!apiKey} onClick={connect}>{connecting ? "Проверяем..." : "Подключить"}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#DCFCE7", color: C.success }}>
              <CheckCircle2 size={28} />
            </div>
            <div className="font-semibold" style={{ fontSize: 16 }}>Магазин подключён</div>
            <p className="text-sm mt-1 mb-6" style={{ color: C.textMuted }}>Загрузите демо-заказы, чтобы увидеть, как работает автоматика.</p>
            <Button onClick={() => onDone(platform, apiKey)}>Загрузить демо-заказы</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================== ДАШБОРД ============================== */
function Dashboard({ state, actions, setPage, openOrder }) {
  const today = state.orders.filter((o) => isSameDay(o.createdAt));
  const inProgress = state.orders.filter((o) => o.status === "processing").length;
  const needReview = state.orders.filter((o) => o.status === "review").length;
  const doneToday = today.filter((o) => o.status === "done" || o.status === "shipped").length;
  const savedMinutes = doneToday * 4;

  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const count = state.orders.filter((o) => isSameDay(o.createdAt, d)).length;
      days.push({ day: d.toLocaleDateString("ru-RU", { weekday: "short" }), count });
    }
    return days;
  }, [state.orders]);

  const recent = [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  if (state.orders.length === 0) {
    return (
      <EmptyState icon={<Package size={24} />} title="Пока нет заказов" subtitle="Сгенерируйте демо-заказы, чтобы увидеть работу дашборда."
        action={<Button onClick={actions.loadDemoOrders}><Sparkles size={16} />Сгенерировать заказы</Button>} />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Заказов сегодня" value={today.length} icon={<Package size={18} />} accent={C.primary} />
        <StatCard label="В обработке" value={inProgress} icon={<Clock size={18} />} accent={C.blue} />
        <StatCard label="Требуют проверки" value={needReview} icon={<AlertTriangle size={18} />} accent={C.warning} />
        <StatCard label="Сэкономлено времени" value={`${savedMinutes} мин`} icon={<Sparkles size={18} />} accent={C.success} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold" style={{ color: C.text }}>Последние заказы</div>
            <button className="text-sm font-medium" style={{ color: C.primary }} onClick={() => setPage("orders")}>Все заказы</button>
          </div>
          <div className="space-y-1">
            {recent.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => openOrder(o.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold" style={{ color: C.text }}>{o.id}</span>
                  <span className="text-sm truncate" style={{ color: C.textMuted }}>{o.customer.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium">{formatMoney(o.total)}</span>
                  <StatusBadge status={o.status} />
                  <span className="text-xs w-10 text-right" style={{ color: C.textMuted }}>{formatTime(o.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-semibold mb-3" style={{ color: C.text }}>Заказы за 7 дней</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: C.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: C.textMuted }} axisLine={false} tickLine={false} width={24} />
              <Tooltip />
              <Bar dataKey="count" fill={C.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-3" style={{ color: C.text }}>Быстрые действия</div>
        <div className="flex flex-wrap gap-2">
          {!state.botActive && <Button onClick={() => actions.setBotActive(true)}><Sparkles size={16} />Запустить бота</Button>}
          <Button variant="secondary" onClick={actions.generateOne}><Plus size={16} />Сгенерировать тестовый заказ</Button>
          <Button variant="secondary" onClick={() => actions.exportExcel(state.orders, "orders")}><Download size={16} />Экспорт в Excel</Button>
        </div>
      </Card>
    </div>
  );
}

/* ============================== ЗАКАЗЫ ============================== */
function OrdersPage({ state, actions, openOrder }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [sourceFilter, setSourceFilter] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [sortBy, setSortBy] = useState({ field: "createdAt", dir: "desc" });
  const [selected, setSelected] = useState([]);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [visibleCount, setVisibleCount] = useState(25);

  const filtered = useMemo(() => {
    let list = state.orders.filter((o) => {
      if (search) {
        const q = search.toLowerCase();
        if (!(o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q))) return false;
      }
      if (statusFilter.length && !statusFilter.includes(o.status)) return false;
      if (sourceFilter && o.source !== sourceFilter) return false;
      if (onlyErrors && o.validation.valid) return false;
      return true;
    });
    list.sort((a, b) => {
      const dir = sortBy.dir === "asc" ? 1 : -1;
      if (sortBy.field === "total") return (a.total - b.total) * dir;
      return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
    });
    return list;
  }, [state.orders, search, statusFilter, sourceFilter, onlyErrors, sortBy]);

  const visible = filtered.slice(0, visibleCount);
  const toggleStatus = (s) => setStatusFilter((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]));
  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = visible.length > 0 && visible.every((o) => selected.includes(o.id));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={C.textMuted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по имени, ID или телефону"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none" style={{ border: `1px solid ${C.border}` }} />
          </div>
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-full md:w-40">
            <option value="">Все источники</option>
            <option value="tilda">Tilda</option>
            <option value="wix">Wix</option>
          </Select>
          <label className="flex items-center gap-2 text-sm shrink-0" style={{ color: C.text }}>
            <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} /> Только с ошибками
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(STATUS_META).map(([key, m]) => (
            <button key={key} onClick={() => toggleStatus(key)}
              className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
              style={{ borderColor: statusFilter.includes(key) ? m.color : C.border, color: statusFilter.includes(key) ? m.color : C.textMuted, background: statusFilter.includes(key) ? m.bg : "#fff" }}>
              {m.label}
            </button>
          ))}
          {(statusFilter.length > 0 || sourceFilter || onlyErrors || search) && (
            <button className="text-xs font-medium" style={{ color: C.primary }} onClick={() => { setStatusFilter([]); setSourceFilter(""); setOnlyErrors(false); setSearch(""); }}>Сбросить фильтры</button>
          )}
        </div>
      </Card>

      {selected.length > 0 && (
        <Card className="p-3 flex items-center gap-3 flex-wrap" style={{ background: "#EDE9FE" }}>
          <span className="text-sm font-medium" style={{ color: C.primary }}>{selected.length} выбрано</span>
          <Button size="sm" onClick={() => setConfirmBatch("done")}><Check size={14} />Отметить выполненным</Button>
          <Button size="sm" variant="secondary" onClick={() => { actions.resendNotifications(selected); setSelected([]); }}><Send size={14} />Переотправить уведомление</Button>
          <Button size="sm" variant="secondary" onClick={() => actions.exportExcel(state.orders.filter((o) => selected.includes(o.id)), "selected_orders")}><Download size={14} />Экспорт выбранных</Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={<Search size={22} />} title="Ничего не найдено" subtitle="Попробуйте изменить условия поиска."
            action={<Button variant="secondary" onClick={() => { setStatusFilter([]); setSourceFilter(""); setOnlyErrors(false); setSearch(""); }}>Сбросить фильтры</Button>} />
        ) : (
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <th className="w-10 py-2.5 px-3"><input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? visible.map((o) => o.id) : [])} /></th>
                  <th className="text-left py-2.5 px-3 font-semibold" style={{ color: C.textMuted }}>ID</th>
                  <th className="text-left py-2.5 px-3 font-semibold cursor-pointer" style={{ color: C.textMuted }} onClick={() => setSortBy({ field: "createdAt", dir: sortBy.dir === "asc" ? "desc" : "asc" })}>
                    <span className="inline-flex items-center gap-1">Дата <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="text-left py-2.5 px-3 font-semibold" style={{ color: C.textMuted }}>Клиент</th>
                  <th className="text-left py-2.5 px-3 font-semibold" style={{ color: C.textMuted }}>Товары</th>
                  <th className="text-left py-2.5 px-3 font-semibold cursor-pointer" style={{ color: C.textMuted }} onClick={() => setSortBy({ field: "total", dir: sortBy.dir === "asc" ? "desc" : "asc" })}>
                    <span className="inline-flex items-center gap-1">Сумма <ArrowUpDown size={12} /></span>
                  </th>
                  <th className="text-left py-2.5 px-3 font-semibold" style={{ color: C.textMuted }}>Доставка</th>
                  <th className="text-left py-2.5 px-3 font-semibold" style={{ color: C.textMuted }}>Статус</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-gray-50" style={{ borderBottom: `1px solid ${C.border}`, background: !o.validation.valid ? "#FFFBEB" : undefined }} onClick={() => openOrder(o.id)}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggleSelect(o.id)} /></td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: C.text }}>{o.id}</td>
                    <td className="px-3 py-2.5" style={{ color: C.textMuted }}>{formatDateTime(o.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <div style={{ color: C.text }}>{o.customer.name}</div>
                      <div className="text-xs" style={{ color: C.textMuted }}>{o.customer.city || "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[160px] truncate" style={{ color: C.textMuted }}>{o.items.map((i) => i.name).join(", ")}</td>
                    <td className="px-3 py-2.5 font-medium" style={{ color: C.text }}>{formatMoney(o.total)}</td>
                    <td className="px-3 py-2.5" style={{ color: C.textMuted }}>{o.deliveryService || "—"}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                    <td className="px-2 py-2.5">{!o.validation.valid && <AlertTriangle size={15} color={C.warning} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* мобильные карточки */}
        {filtered.length > 0 && (
          <div className="md:hidden divide-y" style={{ borderColor: C.border }}>
            {visible.map((o) => (
              <div key={o.id} className="p-3" style={{ background: !o.validation.valid ? "#FFFBEB" : undefined }} onClick={() => openOrder(o.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold" style={{ color: C.text }}>{o.id}</div>
                    <div className="text-sm" style={{ color: C.textMuted }}>{o.customer.name}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span style={{ color: C.textMuted }}>{formatDateTime(o.createdAt)}</span>
                  <span className="font-medium" style={{ color: C.text }}>{formatMoney(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {visibleCount < filtered.length && (
          <div className="p-3 text-center"><button className="text-sm font-medium" style={{ color: C.primary }} onClick={() => setVisibleCount((v) => v + 25)}>Показать ещё ({filtered.length - visibleCount})</button></div>
        )}
      </Card>

      <ConfirmDialog open={!!confirmBatch} onClose={() => setConfirmBatch(null)} title="Отметить выполненным"
        description={`Изменить статус для ${selected.length} заказ(ов) на «Выполнен» и отправить уведомление?`}
        onConfirm={() => { actions.batchSetStatus(selected, "done"); setSelected([]); }} />
    </div>
  );
}

/* ============================== КАРТОЧКА ЗАКАЗА (Drawer) ============================== */
function OrderDetail({ order, onClose, actions }) {
  const [local, setLocal] = useState(order);
  useEffect(() => setLocal(order), [order]);
  if (!order) return null;

  const updateCustomer = (field, value) => setLocal((o) => ({ ...o, customer: { ...o.customer, [field]: value } }));
  const saveField = () => actions.updateOrder(order.id, { customer: local.customer });

  return (
    <Drawer open={!!order} onClose={onClose} title={order.id}>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs" style={{ color: C.textMuted }}>{formatDateTime(order.createdAt)} · {order.source === "tilda" ? "Tilda" : "Wix"}</span>
          </div>
          <div className="flex gap-2">
            <Select value={order.status} onChange={(e) => actions.setOrderStatus(order.id, e.target.value)} className="w-40">
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
            <Button size="sm" variant="secondary" onClick={() => actions.resendNotifications([order.id])}><Send size={14} />Уведомить</Button>
          </div>
        </div>

        {!order.validation.valid && (
          <Card className="p-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <div className="flex items-center gap-2 font-semibold text-sm mb-1" style={{ color: "#92400E" }}><AlertTriangle size={15} />Проверка не пройдена</div>
            <ul className="text-sm list-disc pl-5 space-y-0.5" style={{ color: "#92400E" }}>
              {order.validation.issues.map((i, idx) => <li key={idx}>{i}</li>)}
            </ul>
            <Button size="sm" className="mt-2" onClick={() => actions.markReviewed(order.id)}><Check size={14} />Пометить как проверено</Button>
          </Card>
        )}

        <div>
          <div className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: C.text }}><User size={15} />Клиент</div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Имя" value={local.customer.name} onChange={(e) => updateCustomer("name", e.target.value)} onBlur={saveField} />
            <Input label="Телефон" value={local.customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} onBlur={saveField} />
            <Input label="Email" value={local.customer.email} onChange={(e) => updateCustomer("email", e.target.value)} onBlur={saveField} />
            <Input label="Город" value={local.customer.city} onChange={(e) => updateCustomer("city", e.target.value)} onBlur={saveField} />
            <Input label="Адрес" className="col-span-2" value={local.customer.address} onChange={(e) => updateCustomer("address", e.target.value)} onBlur={saveField} />
          </div>
        </div>

        <div>
          <div className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: C.text }}><Package size={15} />Состав заказа</div>
          <Card className="p-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span style={{ color: C.text }}>{it.name} × {it.qty}</span>
                <span style={{ color: C.textMuted }}>{formatMoney(it.price * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 mt-2" style={{ borderTop: `1px solid ${C.border}` }}>
              <span>Итого</span><span>{formatMoney(order.total)}</span>
            </div>
          </Card>
        </div>

        <div>
          <div className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: C.text }}><Truck size={15} />Доставка и метки</div>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={order.deliveryService || ""} onChange={(e) => actions.updateOrder(order.id, { deliveryService: e.target.value || null })} className="w-44">
              <option value="">Не назначена</option>
              {DELIVERY_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            {order.tags.map((t) => <Badge key={t} color={C.primary} bg="#EDE9FE" icon={<TagIcon size={11} />}>{t}</Badge>)}
          </div>
        </div>

        <div>
          <div className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: C.text }}><History size={15} />История</div>
          <div className="space-y-2">
            {[...order.log].reverse().map((l) => (
              <div key={l.id} className="text-sm flex gap-2">
                <span className="text-xs shrink-0 w-12" style={{ color: C.textMuted }}>{formatTime(l.ts)}</span>
                <span style={{ color: C.text }}><b>{l.actor === "bot" ? "Бот" : "Пользователь"}</b>: {l.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/* ============================== ПРАВИЛА ============================== */
const FIELD_LABEL = { city: "Город", total: "Сумма", item: "Товар", source: "Источник", payment: "Способ оплаты" };
const OP_LABEL = { eq: "равно", neq: "не равно", gt: "больше", lt: "меньше", contains: "содержит" };
const ACTION_LABEL = { assign_delivery: "Назначить службу доставки", add_tag: "Добавить метку", set_priority: "Задать приоритет", send_template: "Отправить шаблон", set_status: "Установить статус" };

function RuleModal({ open, onClose, onSave, rule }) {
  const empty = { name: "", condition: { field: "city", operator: "eq", value: "" }, action: { type: "add_tag", params: { tag: "" } } };
  const [form, setForm] = useState(rule || empty);
  useEffect(() => setForm(rule || empty), [rule, open]);

  const setAction = (type) => {
    const params = type === "assign_delivery" ? { service: DELIVERY_SERVICES[0] }
      : type === "add_tag" ? { tag: "" }
      : type === "set_priority" ? { priority: "high" }
      : type === "send_template" ? { status: "processing" }
      : { status: "processing" };
    setForm((f) => ({ ...f, action: { type, params } }));
  };

  return (
    <Modal open={open} onClose={onClose} title={rule ? "Изменить правило" : "Добавить правило"} width={520}>
      <div className="space-y-4">
        <Input label="Название правила" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Напр. Москва → СДЭК" />
        <div>
          <div className="text-xs font-semibold mb-1" style={{ color: C.text }}>ЕСЛИ</div>
          <div className="grid grid-cols-3 gap-2">
            <Select value={form.condition.field} onChange={(e) => setForm({ ...form, condition: { ...form.condition, field: e.target.value } })}>
              {Object.entries(FIELD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select value={form.condition.operator} onChange={(e) => setForm({ ...form, condition: { ...form.condition, operator: e.target.value } })}>
              {Object.entries(OP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Input value={form.condition.value} onChange={(e) => setForm({ ...form, condition: { ...form.condition, value: e.target.value } })} placeholder="значение" />
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold mb-1" style={{ color: C.text }}>ТО</div>
          <Select value={form.action.type} onChange={(e) => setAction(e.target.value)} className="mb-2">
            {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          {form.action.type === "assign_delivery" && (
            <Select value={form.action.params.service} onChange={(e) => setForm({ ...form, action: { ...form.action, params: { service: e.target.value } } })}>
              {DELIVERY_SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          )}
          {form.action.type === "add_tag" && (
            <Input value={form.action.params.tag} onChange={(e) => setForm({ ...form, action: { ...form.action, params: { tag: e.target.value } } })} placeholder="Напр. VIP" />
          )}
          {form.action.type === "set_priority" && (
            <Select value={form.action.params.priority} onChange={(e) => setForm({ ...form, action: { ...form.action, params: { priority: e.target.value } } })}>
              <option value="high">Высокий</option><option value="normal">Обычный</option><option value="low">Низкий</option>
            </Select>
          )}
          {(form.action.type === "send_template" || form.action.type === "set_status") && (
            <Select value={form.action.params.status} onChange={(e) => setForm({ ...form, action: { ...form.action, params: { status: e.target.value } } })}>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button disabled={!form.name || !form.condition.value} onClick={() => { onSave(form); onClose(); }}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  );
}

function RulesPage({ state, actions }) {
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm max-w-lg" style={{ color: C.textMuted }}>Правила применяются к каждому новому заказу сверху вниз: «ЕСЛИ [поле] [условие] [значение] ТО [действие]».</p>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={16} />Добавить правило</Button>
      </div>
      {state.rules.length === 0 ? (
        <EmptyState icon={<Settings2 size={22} />} title="Нет правил" subtitle="Добавьте первое правило автоматической обработки." action={<Button onClick={() => setModalOpen(true)}><Plus size={16} />Добавить правило</Button>} />
      ) : (
        <div className="space-y-2">
          {state.rules.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-sm" style={{ color: C.text }}>{r.name}</div>
                <div className="text-sm mt-0.5" style={{ color: C.textMuted }}>
                  ЕСЛИ <b>{FIELD_LABEL[r.condition.field]}</b> {OP_LABEL[r.condition.operator]} <b>{r.condition.value}</b> ТО <b>{ACTION_LABEL[r.action.type]}</b>
                  {r.action.params.service && ` — ${r.action.params.service}`}
                  {r.action.params.tag && ` — ${r.action.params.tag}`}
                  {r.action.params.status && ` — ${STATUS_META[r.action.params.status]?.label}`}
                  {r.action.params.priority && ` — ${r.action.params.priority}`}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Switch checked={r.enabled} onChange={(v) => actions.updateRule(r.id, { enabled: v })} showLabel={false} />
                <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 rounded hover:bg-gray-100"><Edit2 size={15} color={C.textMuted} /></button>
                <button onClick={() => setToDelete(r.id)} className="p-1.5 rounded hover:bg-gray-100"><Trash2 size={15} color={C.danger} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <RuleModal open={modalOpen} onClose={() => setModalOpen(false)} rule={editing} onSave={(f) => editing ? actions.updateRule(editing.id, f) : actions.addRule(f)} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Удалить правило" description="Это действие нельзя отменить." danger
        onConfirm={() => actions.deleteRule(toDelete)} />
    </div>
  );
}

/* ============================== УВЕДОМЛЕНИЯ ============================== */
function NotificationsPage({ state, actions }) {
  const demoOrder = state.orders[0];
  return (
    <div className="space-y-4">
      {state.templates.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={t.status} />
              <Select value={t.channel} onChange={(e) => actions.updateTemplate(t.id, { channel: e.target.value })} className="w-32">
                <option value="telegram">Telegram</option><option value="email">Email</option><option value="sms">SMS</option>
              </Select>
            </div>
            <Switch checked={t.enabled} onChange={(v) => actions.updateTemplate(t.id, { enabled: v })} labelOn="Активен" labelOff="Отключён" />
          </div>
          <textarea value={t.text} onChange={(e) => actions.updateTemplate(t.id, { text: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none" style={{ border: `1px solid ${C.border}`, minHeight: 70 }} />
          <div className="text-xs mt-1" style={{ color: C.textMuted }}>Переменные: {"{name} {order_id} {sum} {status}"}</div>
          {demoOrder && (
            <div className="text-xs mt-2 p-2 rounded-lg" style={{ background: C.bg, color: C.text }}>
              <b>Предпросмотр:</b> {renderTemplateText(t.text, demoOrder)}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ============================== ОТЧЁТЫ ============================== */
function ReportsPage({ state, actions }) {
  const [period, setPeriod] = useState("week");
  const filtered = useMemo(() => {
    const now = new Date();
    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    return state.orders.filter((o) => (now - new Date(o.createdAt)) / 86400000 <= days);
  }, [state.orders, period]);

  const revenue = filtered.reduce((s, o) => s + o.total, 0);
  const avg = filtered.length ? Math.round(revenue / filtered.length) : 0;
  const errors = filtered.filter((o) => !o.validation.valid).length;
  const savedHours = ((filtered.filter((o) => o.status === "done" || o.status === "shipped").length * 4) / 60).toFixed(1);

  const byDay = useMemo(() => {
    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      arr.push({ day: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }), count: state.orders.filter((o) => isSameDay(o.createdAt, d)).length, errors: state.orders.filter((o) => isSameDay(o.createdAt, d) && !o.validation.valid).length });
    }
    return arr;
  }, [state.orders, period]);

  const statusDist = Object.entries(STATUS_META).map(([k, m]) => ({ name: m.label, value: filtered.filter((o) => o.status === k).length, color: m.color })).filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[["day", "День"], ["week", "Неделя"], ["month", "Месяц"]].map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: period === k ? C.primary : "#fff", color: period === k ? "#fff" : C.text, border: `1px solid ${period === k ? C.primary : C.border}` }}>{l}</button>
        ))}
        <Button variant="secondary" className="ml-auto" onClick={() => actions.exportExcel(filtered, "report_" + period)}><Download size={16} />Экспорт отчёта в Excel</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Всего заказов" value={filtered.length} icon={<Package size={16} />} accent={C.primary} />
        <StatCard label="Выручка" value={formatMoney(revenue)} icon={<Sparkles size={16} />} accent={C.success} />
        <StatCard label="Средний чек" value={formatMoney(avg)} icon={<BarChart3 size={16} />} accent={C.blue} />
        <StatCard label="Найдено ошибок" value={errors} icon={<AlertTriangle size={16} />} accent={C.warning} />
        <StatCard label="Сэкономлено" value={`${savedHours} ч`} icon={<Clock size={16} />} accent={C.primary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-4">
          <div className="font-semibold mb-3">Заказы по дням</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: C.textMuted }} axisLine={false} tickLine={false} width={24} />
              <Tooltip />
              <Bar dataKey="count" fill={C.primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <div className="font-semibold mb-3">Распределение по статусам</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4">
        <div className="font-semibold mb-3">Доля ошибок по дням</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={byDay}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.border} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: C.textMuted }} axisLine={false} tickLine={false} width={24} />
            <Tooltip />
            <Line type="monotone" dataKey="errors" stroke={C.danger} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ============================== ЖУРНАЛ ============================== */
function LogPage({ state }) {
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const filtered = state.log.filter((l) => (!actor || l.actor === actor) && (!q || (l.orderId || "").toLowerCase().includes(q.toLowerCase()) || l.action.toLowerCase().includes(q.toLowerCase())));
  const sorted = [...filtered].sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" color={C.textMuted} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по ID заказа или действию" className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none" style={{ border: `1px solid ${C.border}` }} />
        </div>
        <Select value={actor} onChange={(e) => setActor(e.target.value)} className="w-full md:w-40">
          <option value="">Все акторы</option><option value="bot">Бот</option><option value="user">Пользователь</option>
        </Select>
      </Card>
      <Card>
        {sorted.length === 0 ? <EmptyState icon={<ScrollText size={22} />} title="Записей нет" /> : (
          <div className="divide-y" style={{ borderColor: C.border }}>
            {sorted.slice(0, 200).map((l) => (
              <div key={l.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0" style={{ color: C.textMuted }}>{formatDateTime(l.ts)}</span>
                <Badge color={l.actor === "bot" ? C.primary : C.blue} bg={l.actor === "bot" ? "#EDE9FE" : "#DBEAFE"}>{l.actor === "bot" ? "Бот" : "Пользователь"}</Badge>
                <span style={{ color: C.text }}>{l.action}</span>
                {l.orderId && <span className="ml-auto font-semibold shrink-0" style={{ color: C.primary }}>{l.orderId}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================== НАСТРОЙКИ ============================== */
function SettingsPage({ state, actions }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  return (
    <div className="space-y-5 max-w-2xl">
      <Card className="p-4">
        <div className="font-semibold mb-3">Подключённые магазины</div>
        {state.store ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.primary + "22", color: C.primary }}><StoreIcon size={18} /></div>
              <div>
                <div className="font-medium capitalize" style={{ color: C.text }}>{state.store.platform === "tilda" ? "Tilda" : "Wix"}</div>
                <div className="text-xs" style={{ color: C.textMuted }}>Подключён {formatDateTime(state.store.connectedAt)}</div>
              </div>
            </div>
            <Badge color={C.success} bg="#DCFCE7">Активен</Badge>
          </div>
        ) : <EmptyState icon={<StoreIcon size={20} />} title="Магазин не подключён" />}
      </Card>

      <Card className="p-4">
        <div className="font-semibold mb-3">Профиль</div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Имя" value={state.user.name} onChange={(e) => actions.updateUser({ name: e.target.value })} />
          <Input label="Email" value={state.user.email} onChange={(e) => actions.updateUser({ email: e.target.value })} />
        </div>
      </Card>

      <Card className="p-4">
        <div className="font-semibold mb-3">Тариф</div>
        <div className="grid grid-cols-3 gap-3">
          {[["start", "Старт"], ["business", "Бизнес"], ["pro", "Про"]].map(([k, l]) => (
            <button key={k} onClick={() => actions.updateUser({ tariff: k })} className="rounded-lg p-3 text-center text-sm font-medium"
              style={{ border: `2px solid ${state.user.tariff === k ? C.primary : C.border}`, background: state.user.tariff === k ? "#EDE9FE" : "#fff", color: state.user.tariff === k ? C.primary : C.text }}>
              {l}{state.user.tariff === k && <div className="text-xs mt-1">Текущий</div>}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4" style={{ border: `1px solid #FCA5A5` }}>
        <div className="font-semibold mb-1" style={{ color: C.danger }}>Опасная зона</div>
        <p className="text-sm mb-3" style={{ color: C.textMuted }}>Полностью очистит все заказы, правила и журнал, вернув приложение к стартовому состоянию.</p>
        <Button variant="danger" onClick={() => setConfirmReset(true)}><RefreshCw size={15} />Сбросить демо-данные</Button>
      </Card>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Сбросить демо-данные" danger
        description="Все заказы, правила, шаблоны и журнал будут удалены безвозвратно. Продолжить?" onConfirm={actions.resetDemo} />
    </div>
  );
}

/* ============================== ГЛАВНОЕ ПРИЛОЖЕНИЕ ============================== */
const STORAGE_KEY = "orderflow-state-v1";

function freshState() {
  return {
    onboarded: false, store: null, user: defaultUser(), botActive: false,
    orders: [], rules: defaultRules(), templates: defaultTemplates(), log: [],
  };
}

export default function App() {
  const [state, setState] = useState(freshState());
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);
  const saveTimer = useRef(null);

  const pushToast = useCallback((msg, type = "success") => {
    const id = uid("TS");
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // загрузка состояния
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setState(parsed);
          counterRef.current = parsed.orders.reduce((max, o) => Math.max(max, parseInt(o.id.split("-")[1] || 0) - 1000), 0);
        }
      } catch (e) { /* нет сохранённых данных — используем стартовое состояние */ }
      setLoaded(true);
    })();
  }, []);

  // сохранение состояния (с задержкой)
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.storage.set(STORAGE_KEY, JSON.stringify(state), false).catch(() => {});
    }, 400);
  }, [state, loaded]);

  const selectedOrder = state.orders.find((o) => o.id === selectedOrderId) || null;

  /* ---------- движок бота ---------- */
  const processOrder = useCallback((order, ordersSnapshot, rules, templates) => {
    let next = { ...order, log: [...order.log] };
    const validation = validateOrder(next, ordersSnapshot);
    if (!validation.valid) {
      next.status = "review";
      next.validation = validation;
      next.log.push(makeLog("bot", "Ошибка валидации: " + validation.issues.join(", ")));
      return { order: next, newLog: [{ ...makeLog("bot", "Заказ " + next.id + " требует проверки"), orderId: next.id }], toast: null };
    }
    next.validation = { valid: true, issues: [] };
    const enabledRules = rules.filter((r) => r.enabled);
    for (const rule of enabledRules) {
      if (matchCondition(next, rule.condition)) {
        next = applyAction(next, rule.action, templates);
      }
    }
    if (next.status === "new") next.status = "processing";
    const newLogs = [{ ...makeLog("bot", "Правила применены, статус: " + STATUS_META[next.status].label), orderId: next.id }];
    next.log.push(makeLog("bot", "Правила применены"));

    const targetStatus = next._sendStatus || next.status;
    delete next._sendStatus;
    const tpl = templates.find((t) => t.status === targetStatus && t.enabled);
    let toast = null;
    if (tpl) {
      const text = renderTemplateText(tpl.text, next);
      next.notifications = [...next.notifications, { status: targetStatus, channel: tpl.channel, text, sentAt: new Date().toISOString() }];
      next.log.push(makeLog("bot", `Уведомление отправлено (${tpl.channel})`));
      newLogs.push({ ...makeLog("bot", `Уведомление по заказу ${next.id} отправлено клиенту`), orderId: next.id });
      toast = `Уведомление отправлено клиенту по заказу ${next.id}`;
    }
    return { order: next, newLog: newLogs, toast };
  }, []);

  const ingestOrder = useCallback((rawOrder) => {
    setState((s) => {
      const { order, newLog, toast } = processOrder(rawOrder, s.orders, s.rules, s.templates);
      if (toast) setTimeout(() => pushToast(toast, "success"), 0);
      return { ...s, orders: [...s.orders, order], log: [...s.log, ...newLog] };
    });
  }, [processOrder, pushToast]);

  const generateOne = useCallback(() => {
    setState((s) => {
      const raw = generateOrder(s.orders, counterRef);
      const { order, newLog, toast } = processOrder(raw, s.orders, s.rules, s.templates);
      if (toast) setTimeout(() => pushToast(toast), 0);
      return { ...s, orders: [...s.orders, order], log: [...s.log, ...newLog] };
    });
  }, [processOrder, pushToast]);

  const loadDemoOrders = useCallback(() => {
    setState((s) => {
      let orders = [...s.orders];
      let log = [...s.log];
      const count = randInt(8, 12);
      for (let i = 0; i < count; i++) {
        const raw = generateOrder(orders, counterRef);
        const res = processOrder(raw, orders, s.rules, s.templates);
        orders = [...orders, res.order];
        log = [...log, ...res.newLog];
      }
      return { ...s, orders, log };
    });
    pushToast("Загружено " + randInt(8, 12) + " демо-заказов");
  }, [processOrder, pushToast]);

  // авто-режим бота
  useEffect(() => {
    if (!state.botActive) return;
    let cancelled = false;
    const schedule = () => {
      const delay = randInt(15000, 30000);
      const t = setTimeout(() => {
        if (cancelled) return;
        generateOne();
        schedule();
      }, delay);
      return t;
    };
    const timerId = schedule();
    return () => { cancelled = true; clearTimeout(timerId); };
  }, [state.botActive, generateOne]);

  /* ---------- действия ---------- */
  const actions = useMemo(() => ({
    setBotActive: (v) => setState((s) => ({ ...s, botActive: v })),
    generateOne,
    loadDemoOrders,
    updateOrder: (id, patch) => setState((s) => ({ ...s, orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch, log: [...o.log, makeLog("user", "Изменены данные заказа")] } : o)) })),
    setOrderStatus: (id, status) => setState((s) => {
      const orders = s.orders.map((o) => {
        if (o.id !== id) return o;
        const tpl = s.templates.find((t) => t.status === status && t.enabled);
        const log = [...o.log, makeLog("user", `Статус изменён на «${STATUS_META[status].label}»`)];
        let notifications = o.notifications;
        if (tpl) {
          const text = renderTemplateText(tpl.text, { ...o, status });
          notifications = [...notifications, { status, channel: tpl.channel, text, sentAt: new Date().toISOString() }];
          log.push(makeLog("bot", `Уведомление отправлено (${tpl.channel})`));
        }
        return { ...o, status, log, notifications };
      });
      return { ...s, orders, log: [...s.log, { ...makeLog("user", `Статус заказа ${id} изменён`), orderId: id }] };
    }),
    markReviewed: (id) => setState((s) => {
      const orders = s.orders.map((o) => {
        if (o.id !== id) return o;
        const revalidated = validateOrder(o, s.orders);
        let next = { ...o };
        if (revalidated.valid) {
          next.validation = { valid: true, issues: [] };
          next.status = "processing";
          next.log = [...next.log, makeLog("user", "Заказ помечен как проверенный")];
        } else {
          next.validation = revalidated;
          next.log = [...next.log, makeLog("user", "Проверка выполнена, но проблемы остались: " + revalidated.issues.join(", "))];
        }
        return next;
      });
      return { ...s, orders, log: [...s.log, { ...makeLog("user", `Заказ ${id} проверен вручную`), orderId: id }] };
    }),
    batchSetStatus: (ids, status) => setState((s) => {
      const orders = s.orders.map((o) => {
        if (!ids.includes(o.id)) return o;
        const tpl = s.templates.find((t) => t.status === status && t.enabled);
        const log = [...o.log, makeLog("user", `Статус изменён на «${STATUS_META[status].label}» (пакетно)`)];
        let notifications = o.notifications;
        if (tpl) {
          const text = renderTemplateText(tpl.text, { ...o, status });
          notifications = [...notifications, { status, channel: tpl.channel, text, sentAt: new Date().toISOString() }];
        }
        return { ...o, status, log, notifications };
      });
      pushToast(`Обновлено заказов: ${ids.length}`);
      return { ...s, orders, log: [...s.log, ...ids.map((id) => ({ ...makeLog("user", "Пакетное изменение статуса"), orderId: id }))] };
    }),
    resendNotifications: (ids) => setState((s) => {
      const orders = s.orders.map((o) => {
        if (!ids.includes(o.id)) return o;
        const tpl = s.templates.find((t) => t.status === o.status && t.enabled);
        if (!tpl) return o;
        const text = renderTemplateText(tpl.text, o);
        return { ...o, notifications: [...o.notifications, { status: o.status, channel: tpl.channel, text, sentAt: new Date().toISOString() }], log: [...o.log, makeLog("bot", `Уведомление переотправлено (${tpl.channel})`)] };
      });
      pushToast(`Уведомления переотправлены: ${ids.length}`);
      return { ...s, orders, log: [...s.log, ...ids.map((id) => ({ ...makeLog("bot", "Уведомление переотправлено"), orderId: id }))] };
    }),
    addRule: (rule) => setState((s) => ({ ...s, rules: [...s.rules, { ...rule, id: uid("RL"), enabled: true }] })),
    updateRule: (id, patch) => setState((s) => ({ ...s, rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
    deleteRule: (id) => setState((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) })),
    updateTemplate: (id, patch) => setState((s) => ({ ...s, templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    updateUser: (patch) => setState((s) => ({ ...s, user: { ...s.user, ...patch } })),
    resetDemo: () => { setState(freshState()); counterRef.current = 0; pushToast("Демо-данные сброшены"); },
    exportExcel: (orders, filename) => {
      const rows = orders.map((o) => ({
        ID: o.id, Дата: formatDateTime(o.createdAt), Клиент: o.customer.name, Телефон: o.customer.phone,
        Город: o.customer.city, Товары: o.items.map((i) => `${i.name} x${i.qty}`).join("; "),
        Сумма: o.total, Статус: STATUS_META[o.status].label, Доставка: o.deliveryService || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Заказы");
      const summary = [{ Показатель: "Всего заказов", Значение: orders.length }, { Показатель: "Выручка", Значение: orders.reduce((s, o) => s + o.total, 0) }];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, "Сводка");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      pushToast("Файл выгружен");
    },
  }), [generateOne, loadDemoOrders, pushToast]);

  const finishOnboarding = (platform, apiKey) => {
    setState((s) => ({ ...s, onboarded: true, store: { id: uid("ST"), platform, name: platform === "tilda" ? "Мой магазин на Tilda" : "Мой магазин на Wix", apiKey, connected: true, connectedAt: new Date().toISOString() } }));
    setTimeout(loadDemoOrders, 50);
    setPage("dashboard");
  };

  const openOrder = (id) => setSelectedOrderId(id);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}><Loader2 className="animate-spin" color={C.primary} size={28} /></div>;
  }

  if (!state.onboarded || !state.store) {
    return <div style={{ fontFamily: "Inter, system-ui, sans-serif" }}><Onboarding onDone={finishOnboarding} /></div>;
  }

  const titleMap = { dashboard: "Дашборд", orders: "Заказы", rules: "Правила обработки", notifications: "Уведомления", reports: "Отчёты и аналитика", log: "Журнал действий бота", settings: "Настройки" };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <div className="flex" style={{ minHeight: "100vh" }}>
        <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar title={titleMap[page]} botActive={state.botActive} setBotActive={actions.setBotActive} setMobileOpen={setMobileOpen} user={state.user} />
          <div className="p-4 md:p-6 flex-1">
            {page === "dashboard" && <Dashboard state={state} actions={actions} setPage={setPage} openOrder={openOrder} />}
            {page === "orders" && <OrdersPage state={state} actions={actions} openOrder={openOrder} />}
            {page === "rules" && <RulesPage state={state} actions={actions} />}
            {page === "notifications" && <NotificationsPage state={state} actions={actions} />}
            {page === "reports" && <ReportsPage state={state} actions={actions} />}
            {page === "log" && <LogPage state={state} />}
            {page === "settings" && <SettingsPage state={state} actions={actions} />}
          </div>
        </div>
      </div>
      <OrderDetail order={selectedOrder} onClose={() => setSelectedOrderId(null)} actions={actions} />
      <ToastHost toasts={toasts} remove={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

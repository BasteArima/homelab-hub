import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ru";

type Dict = Record<string, string>;

const EN: Dict = {
  local_network: "Local Network",
  remote_access: "Remote Access",
  edit: "Edit",
  edit_dashboard: "Edit dashboard",
  signin_to_edit: "Sign in to edit",
  light_theme: "Light theme",
  dark_theme: "Dark theme",
  search_services: "Search services…",
  command_palette: "Command palette (Ctrl/⌘ K)",
  all: "All",
  comfortable: "Comfortable",
  compact: "Compact",
  list: "List",
  loading_services: "Loading services…",
  failed_load: "Failed to load services: {msg}",
  no_services_yet: "No services yet. Click Edit to add some.",
  no_match: 'No services match "{q}"',
  expand: "Expand",
  collapse: "Collapse",
  editing: "Editing",
  unsaved_changes: "Unsaved changes",
  import: "Import",
  export: "Export",
  sign_out: "Sign out",
  sign_out_title: "Sign out (forget this device)",
  cancel: "Cancel",
  save: "Save",
  saving: "Saving…",
  new_group: "New group",
  add: "Add",
  add_service_group: "Add service to this group",
  remove_empty_group: "Remove empty group",
  rename_group: "Rename group",
  discard_changes: "Discard unsaved changes?",
  discard_signout: "Discard unsaved changes and sign out?",
  enter_password_edit: "Enter admin password to edit the dashboard.",
  private_prompt: "This dashboard is private. Enter the admin password to continue.",
  password: "Password",
  continue: "Continue",
  unlock: "Unlock",
  invalid_password: "Invalid password",
  network_error: "Network error — try again",
  session_expired: "Session expired — sign in again",
  new_service: "New service",
  edit_word: "Edit",
  service: "service",
  name: "Name",
  unique: "unique",
  icon: "Icon",
  group: "Group",
  description: "Description",
  local: "Local",
  remote: "Remote",
  proto: "Proto",
  host_ip: "Host / IP",
  blank_this_host: "blank = this host",
  port: "Port",
  optional: "optional",
  domain: "Domain",
  path: "Path",
  added_to_both: "added to both",
  ping: "Ping",
  opens: "Opens",
  delete: "Delete",
  duplicate: "Duplicate",
  done: "Done",
  color: "Color",
  auto: "Auto",
  auto_from_id: "Auto (from id)",
  choose_or_type: "Choose or type…",
  create: "Create",
  search_logos_icons: "Search logos & icons…",
  logos: "Logos",
  icons: "Icons",
  pick_an_icon: "Pick an icon",
  browse_brand_logos: "Browse brand logos",
  type_to_find_logos: "Type a name to find brand logos",
  icon_from_name: "icon from name",
  custom_url: "custom URL",
  counts_logos_icons: "{logos} logos · {icons} icons",
  jump_to_service: "Jump to a service…",
  no_services_found: "No services found.",
  untitled: "Untitled",
  offline: "Offline",
  checking: "Checking…",
  ping_lower: "ping",
  move_up: "Move up",
  move_down: "Move down",
  delete_service: "Delete service",
  saved_n: "Saved {n} services",
  deleted_x: "Deleted “{x}”",
  undo: "Undo",
  signed_out: "Signed out",
  imported_n: "Imported {n} services",
  import_failed: "Import failed: {msg}",
  import_bad: "File must contain a JSON array",
};

const RU: Dict = {
  local_network: "Локальная сеть",
  remote_access: "Удалённый доступ",
  edit: "Править",
  edit_dashboard: "Редактировать дашборд",
  signin_to_edit: "Войти для редактирования",
  light_theme: "Светлая тема",
  dark_theme: "Тёмная тема",
  search_services: "Поиск сервисов…",
  command_palette: "Палитра команд (Ctrl/⌘ K)",
  all: "Все",
  comfortable: "Крупно",
  compact: "Плотно",
  list: "Список",
  loading_services: "Загрузка сервисов…",
  failed_load: "Не удалось загрузить сервисы: {msg}",
  no_services_yet: "Сервисов пока нет. Нажмите «Править», чтобы добавить.",
  no_match: "Нет сервисов по запросу «{q}»",
  expand: "Развернуть",
  collapse: "Свернуть",
  editing: "Редактирование",
  unsaved_changes: "Есть несохранённые",
  import: "Импорт",
  export: "Экспорт",
  sign_out: "Выйти",
  sign_out_title: "Выйти (забыть это устройство)",
  cancel: "Отмена",
  save: "Сохранить",
  saving: "Сохранение…",
  new_group: "Новая группа",
  add: "Добавить",
  add_service_group: "Добавить сервис в эту группу",
  remove_empty_group: "Удалить пустую группу",
  rename_group: "Переименовать группу",
  discard_changes: "Отменить несохранённые изменения?",
  discard_signout: "Отменить несохранённые изменения и выйти?",
  enter_password_edit: "Введите пароль администратора для редактирования.",
  private_prompt: "Дашборд приватный. Введите пароль администратора, чтобы продолжить.",
  password: "Пароль",
  continue: "Продолжить",
  unlock: "Разблокировать",
  invalid_password: "Неверный пароль",
  network_error: "Ошибка сети — попробуйте ещё раз",
  session_expired: "Сессия истекла — войдите снова",
  new_service: "Новый сервис",
  edit_word: "Правка",
  service: "сервис",
  name: "Имя",
  unique: "уникальный",
  icon: "Иконка",
  group: "Группа",
  description: "Описание",
  local: "Локально",
  remote: "Внешне",
  proto: "Протокол",
  host_ip: "Хост / IP",
  blank_this_host: "пусто = этот хост",
  port: "Порт",
  optional: "необязательно",
  domain: "Домен",
  path: "Путь",
  added_to_both: "к обоим адресам",
  ping: "Пинг",
  opens: "Открывает",
  delete: "Удалить",
  duplicate: "Дублировать",
  done: "Готово",
  color: "Цвет",
  auto: "Авто",
  auto_from_id: "Авто (по id)",
  choose_or_type: "Выбрать или ввести…",
  create: "Создать",
  search_logos_icons: "Поиск лого и иконок…",
  logos: "Лого",
  icons: "Иконки",
  pick_an_icon: "Выберите иконку",
  browse_brand_logos: "Каталог лого",
  type_to_find_logos: "Введите название для поиска лого",
  icon_from_name: "иконка по имени",
  custom_url: "своя ссылка",
  counts_logos_icons: "{logos} лого · {icons} иконок",
  jump_to_service: "Перейти к сервису…",
  no_services_found: "Сервисы не найдены.",
  untitled: "Без названия",
  offline: "Офлайн",
  checking: "Проверка…",
  ping_lower: "пинг",
  move_up: "Вверх",
  move_down: "Вниз",
  delete_service: "Удалить сервис",
  saved_n: "Сохранено сервисов: {n}",
  deleted_x: "Удалён «{x}»",
  undo: "Вернуть",
  signed_out: "Вы вышли",
  imported_n: "Импортировано сервисов: {n}",
  import_failed: "Ошибка импорта: {msg}",
  import_bad: "Файл должен содержать JSON-массив",
};

const DICTS: Record<Lang, Dict> = { en: EN, ru: RU };

export type TFn = (key: string, params?: Record<string, string | number>) => string;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: TFn };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem("hub.lang");
      if (s === "ru" || s === "en") setLangState(s);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("hub.lang", l);
    } catch {
      /* ignore */
    }
  };

  const t: TFn = (key, params) => {
    let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(LangCtx);
  if (!c) throw new Error("useI18n must be used within LangProvider");
  return c;
}

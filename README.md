# 🏠 Homelab Hub — Персональный Dashboard

Модная, тёмная, glassmorphism-стартовая страница для доступа ко всем вашим self-hosted сервисам. Управление списком сервисов прямо из браузера (без редактирования кода и пересборки), фильтрация поиском, группировка, пинг VPS и автоопределение локальной / удалённой сети.

---

## 🚀 Быстрый старт через Docker

При каждом коммите GitHub Actions собирает образ и публикует его в **GitHub Container Registry** — `ghcr.io/bastearima/homelab-hub:latest`. Поднять можно двумя способами.

### Вариант A — Portainer (рекомендуется)

1. **Stacks → Add stack** → вставьте содержимое `docker-compose.yml` (или укажите репозиторий).
2. В **Environment variables** задайте `ADMIN_PASSWORD`.
3. **Deploy the stack**.
4. Обновление: на странице стека нажмите **Pull and redeploy** (включите *Re-pull image*) — Portainer вытянет свежий образ из ghcr.

### Вариант B — docker compose на сервере

```bash
# (опционально) задать пароль админа
export ADMIN_PASSWORD="my-strong-password"

# Вытянуть свежий образ из ghcr и поднять
docker compose pull && docker compose up -d
```

> Хотите собирать локально, а не тянуть из ghcr? В `docker-compose.yml` закомментируйте строку `image:` и раскомментируйте `build: .`, затем `docker compose up -d --build`.

Приложение будет доступно на порту **`6232`** (снаружи) → `3001` (внутри контейнера).

```
http://<IP-вашего-сервера>:6232
```

Конфигурация сервисов хранится в именованном volume **`homelab-data`** (`/app/data/services.json` внутри контейнера). При первом запуске volume автоматически наполняется сидом из образа, а ваши правки переживают обновление и redeploy.

---

## 🛠 Управление сервисами через UI

1. Откройте dashboard в браузере.
2. Нажмите иконку шестерёнки ⚙️ в правом верхнем углу.
3. Введите пароль (`ADMIN_PASSWORD` из переменной окружения, по умолчанию — `admin123`).
4. Добавляйте / редактируйте / удаляйте сервисы в форме и нажмите **Save**.

Все изменения немедленно сохраняются в `data/services.json` и применяются без перезапуска контейнера.

### Поля сервиса

| Поле | Назначение |
|------|-----------|
| `id` | Уникальный идентификатор |
| `name` | Отображаемое имя |
| `group` | Категория для группировки (System / Media / Apps / VPS / …) |
| `icon` | Имя иконки из [lucide.dev](https://lucide.dev/icons/) |
| **Local** `localProtocol` | Протокол при локальном доступе. По умолчанию `http` |
| **Local** `localHost` | LAN-хост / IP сервиса. Пусто = хост самого dashboard |
| **Local** `localPort` | Порт при локальном доступе |
| **Remote** `remoteProtocol` | Протокол при удалённом доступе. По умолчанию `https` |
| **Remote** `domain` | Внешний домен (удалённый доступ + пинг VPS) |
| **Remote** `remotePort` | Порт при удалённом доступе. Обычно пусто (за reverse proxy на 80/443) |
| `localPath` | Путь (обычно `/`), добавляется к обоим адресам |
| `isVps` | Включает индикатор Online/Offline с пингом |
| `description` | Подпись под названием |

Локальный и удалённый доступ теперь настраиваются **независимо**: dashboard сам выбирает набор полей в зависимости от того, откуда вы зашли (LAN → блок **Local**, снаружи → блок **Remote**). Это убирает путаницу с http/https и портами.

### Сервис на отдельной машине в LAN (роутер, Proxmox, …)
Заполните блок **Local**: `localHost` = IP устройства (например `192.168.0.1`) и `localPort`. Если `localHost` пуст, локальная ссылка ведёт на хост самого dashboard.

### Сервис только с внешним доступом
Заполните блок **Remote** (`domain`), `isVps: true` для пинга. Блок **Local** можно не заполнять.

### Сервис с локальным **и** внешним доступом
Заполните оба блока. Dashboard сам выберет правильный URL в зависимости от того, откуда вы зашли (см. таблицу ниже).

---

## 🔐 API (для автоматизации)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/services` | Получить текущий список сервисов (JSON-массив) |
| POST | `/api/services` | Перезаписать список. Body: `{ "adminPassword": "...", "services": [ ... ] }` |

Пример обновления через `curl`:

```bash
curl -X POST http://<host>:6232/api/services \
  -H 'Content-Type: application/json' \
  -d '{"adminPassword":"admin123","services":[ ... ]}'
```

---

## 📁 Структура проекта

| Файл / папка | Назначение |
|-------------|------------|
| `data/services.json` | **Сид списка сервисов** (запекается в образ; рантайм-данные живут в volume `homelab-data`) |
| `.github/workflows/docker-image.yml` | CI: сборка и публикация образа в ghcr при каждом коммите |
| `src/routes/api/services.ts` | API endpoint: GET / POST для управления списком |
| `src/lib/services-config.ts` | Типы + клиентские helpers (`fetchServices`, `saveServices`) |
| `src/lib/services-data.server.ts` | Серверная логика чтения/записи JSON |
| `src/components/AdminPanel.tsx` | Модалка администратора (auth + CRUD-форма) |
| `src/routes/index.tsx` | Главная страница dashboard |
| `src/components/ServiceCard.tsx` | Карточка сервиса |
| `public/favicon.svg` | Favicon |
| `Dockerfile` / `docker-compose.yml` | Сборка и запуск |
| `docker-server.mjs` | Node-сервер: статика → SSR fallback |

---

## ⚙️ Как добавить / удалить / изменить сервис

Всё управление сервисами ведётся в **одном** файле:

```ts
// src/lib/services-config.ts
```

### Добавить сервис

Добавьте объект в массив `servicesData`:

```ts
{
  id: "unique-id",           // уникальный идентификатор (латиница, без пробелов)
  name: "Service Name",      // отображаемое имя
  group: "Group Name",       // категория для группировки (например: "System", "Media", "Downloads")
  icon: "IconName",          // имя иконки из lucide-react (https://lucide.dev/icons/)
  localPort: 8080,           // локальный порт (используется при доступе по IP 192.168.x.x / 10.x.x.x)
  localPath: "/",            // локальный путь (обычно "/")
  domain: "service.my.ru",   // внешний домен (используется при удалённом доступе)
  isVps: false,              // true = пинговать доступность через публичный домен
  description: "What it does" // краткое описание под названием
}
```

**Пример — добавить Pi-hole:**

```ts
{
  id: "pihole",
  name: "Pi-hole",
  group: "System",
  icon: "Shield",
  localPort: 8080,
  localPath: "/admin",
  domain: "pihole.my.ru",
  isVps: false,
  description: "DNS-level ad blocker"
}
```

### Удалить сервис

Просто удалите соответствующий объект из массива `servicesData`.

### Изменить сервис

Отредактируйте поля в существующем объекте.

**После любого изменения** пересоберите образ:

```bash
docker compose up -d --build
```

---

## 🌐 Логика маршрутизации: локальная сеть vs удалённый доступ

Dashboard автоматически определяет, откуда вы зашли:

| Условие | Определён как | Поведение ссылок |
|--------|---------------|-----------------|
| `localhost`, `127.0.0.1`, `192.168.*`, `10.*`, `172.16-31.*` | **Local Network** | Ссылки ведут на `http://<IP>:<localPort><localPath>` |
| Всё остальное (домен, VPN, интернет) | **Remote Access** | Ссылки ведут на `https://<domain><localPath>` |

Эта логика живёт в функции `resolveServiceUrl()` внутри `src/lib/services-config.ts`.

```ts
export function resolveServiceUrl(svc: Service): string {
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    /^192\.168\./.test(host) ||      // домашние роутеры
    /^10\./.test(host) ||            // частные сети 10/8
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host); // частные 172.16-31

  if (isLocal) return `http://${host}:${svc.localPort}${svc.localPath}`;
  return `https://${svc.domain}${svc.localPath}`;
}
```

> **Подсказка:** если ваш домашний роутер использует другую подсеть (например, `100.64.x.x` Tailscale), добавьте её в регулярное выражение `isLocal`.

---

## 🖥️ Сервисы без локального доступа (только внешний домен)

Если сервис хостится где-то далеко (VPS, облако) и у него **нет** локального IP:порта — всё равно укажите:

- `localPort` → любой запасной порт (например, `443` или `0`) — он не будет использоваться, потому что `resolveServiceUrl()` всегда вернёт `https://domain` при удалённом доступе, а при локальном доступе вы всё равно увидите тот же `domain` если `host` не попадает под `isLocal`.
- **Но лучше:** если сервис реально доступен и локально (через WireGuard/Tailscale к VPS), укажите реальный `localPort` проброшенный через VPN.

Если сервис **никогда** не доступен локально (чисто публичный VPS):

```ts
{
  id: "public-only",
  name: "Public Service",
  group: "VPS",
  icon: "Globe",
  localPort: 443,     // заглушка, не используется при локальном доступе
  localPath: "/",
  domain: "public.example.com",
  isVps: true,        // пинговать доступность
  description: "Cloud-hosted only"
}
```

При локальном открытии dashboard (с `192.168.x.x`) ссылка всё равно пойдёт на `http://192.168.x.x:443/`, что скорее всего не работает. В таком случае есть два пути:

1. **Доступ к VPS через VPN** — укажите `localPort` как порт, который вы пробросили через VPN-туннель к VPS (например, тот же `8222`).
2. **Всегда использовать домен** — если ваш роутер/файрвол не блокирует обращения к внешнему домену из локалки (NAT hairpin / loopback), то всё и так будет работать через `domain`.

Если хотите, чтобы **все** ссылки вели на `domain` независимо от сети, закомментируйте или измените логику `isLocal` в `resolveServiceUrl`.

---

## 🐳 Docker-команды

```bash
# Поднять (тянет образ из ghcr)
docker compose pull && docker compose up -d

# Посмотреть логи
docker compose logs -f

# Перезапустить
docker compose restart

# Остановить
docker compose down

# Обновить после нового коммита (CI уже собрал свежий образ)
docker compose pull && docker compose up -d

# Локальная сборка вместо ghcr (если в compose включён build: .)
docker compose up -d --build
```

---

## 🛠️ Технические детали

| Технология | Роль |
|-----------|------|
| **React 19 + TanStack Start** | SSR-фреймворк, file-based routing |
| **Tailwind CSS v4** | Utility-first стили |
| **Lucide React** | Иконки (динамические по имени) |
| **Bun** | Быстрая установка зависимостей и сборка |
| **Node 22 Alpine** | Лёгкий production-рантайм |
| **Cloudflare Worker entry** | Сборка SSR-билда (адаптирован под Node в `docker-server.mjs`) |

---

## 📝 Кастомизация

- **Цвета / тема** — редактируйте CSS-переменные в `src/styles.css` (`:root { ... }`).
- **Группы** — просто измените строку `group` у сервисов; dashboard группирует автоматически.
- **Иконки** — найдите нужное имя на [lucide.dev](https://lucide.dev/icons/) и пропишите в поле `icon` (например: `Shield`, `Globe`, `Database`).
- **Пинг** — поле `isVps: true` включает зелёный/красный индикатор с RTT для внешних сервисов. Для локальных сервисов пинг отключён (CORS/сетевая изоляция).

---

## ❓ Частые вопросы

**Q: Почему порт внешний 6232?**  
A: Задано в `docker-compose.yml`. Можете поменять на любой другой, заменив `"6232:3001"` на `"<ваш-порт>:3001"`.

**Q: Как добавить HTTPS / reverse proxy?**  
A: Поставьте перед контейнером **Traefik** или **Nginx Proxy Manager**. Dashboard сам по себе работает по HTTP. Пробрасывайте домен на порт `6232`.

**Q: Почему статусы сервисов (пинг) не работают локально?**  
A: Браузерный `fetch` с `mode: "no-cors"` не может получить статус ответа для локальных IP без CORS-заголовков. Пинг реально работает только для публичных доменов (`isVps: true`).

**Q: Можно ли использовать только внешние домены, даже из локалки?**  
A: Да — если ваш роутер поддерживает NAT hairpin (обращение к своему внешнему IP/домену из локалки), либо просто измените `resolveServiceUrl()`, убрав локальную ветку.

---

Создано с помощью [Lovable](https://lovable.dev) + TanStack Start.

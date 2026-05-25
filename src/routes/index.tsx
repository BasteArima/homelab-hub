import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Globe, Wifi } from "lucide-react";
import { servicesData } from "@/lib/services-config";
import { ServiceCard } from "@/components/ServiceCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homelab Hub" },
      { name: "description", content: "Personal homelab dashboard for self-hosted services." },
    ],
  }),
  component: Index,
});

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Index() {
  const [query, setQuery] = useState("");
  const now = useClock();
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  const isLocal = useMemo(
    () =>
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host),
    [host],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return servicesData;
    return servicesData.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof servicesData>();
    for (const s of filtered) {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group)!.push(s);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {isLocal ? <Wifi className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            <span>{isLocal ? "Local Network" : "Remote Access"}</span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-mono">{host || "—"}</span>
          </div>
          <h1 className="mt-2 bg-gradient-to-r from-primary via-foreground to-accent bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            Homelab Hub
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{date}</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-4xl font-light tabular-nums text-foreground sm:text-5xl">
            {time}
          </div>
        </div>
      </header>

      <div className="glass-card mb-10 flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search services…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          {filtered.length} / {servicesData.length}
        </kbd>
      </div>

      <div className="space-y-10 pb-16">
        {grouped.map(([group, items]) => (
          <section key={group}>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {group}
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
              <span className="text-[10px] text-muted-foreground/60">{items.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <div className="py-20 text-center text-sm text-muted-foreground">
            No services match "{query}"
          </div>
        )}
      </div>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Globe,
  Wifi,
  Loader2,
  Pencil,
  Plus,
  FolderPlus,
  Download,
  Upload,
  Save,
  X,
  Lock,
} from "lucide-react";
import {
  fetchServices,
  isLocalHost,
  saveServices,
  verifyPassword,
  type Service,
} from "@/lib/services-config";
import { assignGroupColors } from "@/lib/service-colors";
import { ServiceCard } from "@/components/ServiceCard";
import { ServiceEditorModal } from "@/components/ServiceEditorModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homelab Hub" },
      { name: "description", content: "Personal homelab dashboard for self-hosted services." },
    ],
  }),
  component: Index,
});

/** A draft service plus a stable key that survives id edits and duplicates. */
type Draft = { uid: string; svc: Service };

const EMPTY: Service = {
  id: "",
  name: "",
  group: "System",
  icon: "Box",
  localProtocol: "http",
  localHost: "",
  localPort: 80,
  localPath: "/",
  remoteProtocol: "https",
  domain: "",
  remotePort: 0,
  isVps: false,
  description: "",
};

function deriveGroups<T extends { svc: Service }>(items: T[], extra: string[]) {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const it of items) {
    const g = it.svc.group || "Ungrouped";
    if (!map.has(g)) {
      map.set(g, []);
      order.push(g);
    }
    map.get(g)!.push(it);
  }
  for (const g of extra) {
    if (!map.has(g)) {
      map.set(g, []);
      order.push(g);
    }
  }
  return order.map((name) => ({ name, items: map.get(name) ?? [] }));
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Index() {
  const [query, setQuery] = useState("");
  const now = useClock();
  const [host, setHost] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState<Draft[]>([]);
  const [emptyGroups, setEmptyGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editorUid, setEditorUid] = useState<string | null>(null);
  const [newUids, setNewUids] = useState<Set<string>>(new Set());

  // Login
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // Drag
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ group: string; beforeUid: string | null } | null>(
    null,
  );

  const uidRef = useRef(0);
  const nextUid = () => `u${uidRef.current++}`;
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHost(window.location.hostname);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchServices()
      .then((s) => {
        if (mounted) {
          setServices(s);
          setLoadError(null);
        }
      })
      .catch((e) => mounted && setLoadError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const isLocal = useMemo(() => isLocalHost(host), [host]);

  // ── Display grouping (with search) ─────────────────────────────
  const displayGrouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? services.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.group.toLowerCase().includes(q) ||
            s.domain.toLowerCase().includes(q),
        )
      : services;
    const groups = new Map<string, Service[]>();
    for (const s of filtered) {
      if (!groups.has(s.group)) groups.set(s.group, []);
      groups.get(s.group)!.push(s);
    }
    return { entries: Array.from(groups.entries()), count: filtered.length };
  }, [query, services]);

  // ── Edit grouping ──────────────────────────────────────────────
  const editGroups = useMemo(() => deriveGroups(draft, emptyGroups), [draft, emptyGroups]);
  const groupNames = useMemo(() => editGroups.map((g) => g.name), [editGroups]);

  const orderedDraft = useMemo(
    () => editGroups.flatMap((g) => g.items.map((i) => i.svc)),
    [editGroups],
  );
  const dirty = useMemo(
    () => editMode && JSON.stringify(orderedDraft) !== JSON.stringify(services),
    [editMode, orderedDraft, services],
  );

  // ── Login → enter edit mode ────────────────────────────────────
  const doLogin = async () => {
    setLoginBusy(true);
    setLoginError(null);
    try {
      const ok = await verifyPassword(loginPassword);
      if (!ok) {
        setLoginError("Invalid password");
        return;
      }
      setPassword(loginPassword);
      setLoginPassword("");
      setLoginOpen(false);
      uidRef.current = 0;
      setDraft(services.map((svc) => ({ uid: nextUid(), svc })));
      setEmptyGroups([]);
      setNewUids(new Set());
      setEditMode(true);
    } catch {
      setLoginError("Network error — try again");
    } finally {
      setLoginBusy(false);
    }
  };

  const cancelEdit = () => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setEditMode(false);
    setDraft([]);
    setEmptyGroups([]);
    setEditorUid(null);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await saveServices(orderedDraft, password);
      setServices(orderedDraft);
      setEditMode(false);
      setDraft([]);
      setEmptyGroups([]);
      setEditorUid(null);
      toast.success(`Saved ${orderedDraft.length} services`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      if (msg === "Invalid password") {
        setLoginError("Password no longer valid — sign in again");
        setLoginOpen(true);
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Draft mutations ────────────────────────────────────────────
  const updateDraft = (uid: string, svc: Service) =>
    setDraft((cur) => cur.map((i) => (i.uid === uid ? { ...i, svc } : i)));

  const removeDraft = (uid: string) => {
    const idx = draft.findIndex((i) => i.uid === uid);
    if (idx === -1) return;
    const removed = draft[idx];
    setDraft((cur) => cur.filter((i) => i.uid !== uid));
    if (editorUid === uid) setEditorUid(null);
    toast(`Deleted “${removed.svc.name || removed.svc.id || "service"}”`, {
      action: {
        label: "Undo",
        onClick: () =>
          setDraft((cur) => {
            const arr = [...cur];
            arr.splice(Math.min(idx, arr.length), 0, removed);
            return arr;
          }),
      },
    });
  };

  const duplicateDraft = (uid: string) => {
    const it = draft.find((i) => i.uid === uid);
    if (!it) return;
    const uid2 = nextUid();
    const copy: Service = {
      ...it.svc,
      id: `${it.svc.id || "service"}-copy`,
      name: it.svc.name ? `${it.svc.name} copy` : "",
    };
    setDraft((cur) => {
      const arr = [...cur];
      const i = arr.findIndex((x) => x.uid === uid);
      arr.splice(i + 1, 0, { uid: uid2, svc: copy });
      return arr;
    });
    setNewUids((s) => new Set(s).add(uid2));
    setEditorUid(uid2);
  };

  const addToGroup = (group: string) => {
    const uid = nextUid();
    const svc: Service = { ...EMPTY, id: `service-${Date.now()}`, group };
    setDraft((cur) => {
      const arr = [...cur];
      let lastIdx = -1;
      arr.forEach((it, i) => {
        if ((it.svc.group || "Ungrouped") === group) lastIdx = i;
      });
      if (lastIdx === -1) arr.push({ uid, svc });
      else arr.splice(lastIdx + 1, 0, { uid, svc });
      return arr;
    });
    setEmptyGroups((g) => g.filter((x) => x !== group));
    setNewUids((s) => new Set(s).add(uid));
    setEditorUid(uid);
  };

  const renameGroup = (oldName: string, newName: string) => {
    const name = newName || "Ungrouped";
    setDraft((cur) =>
      cur.map((i) =>
        (i.svc.group || "Ungrouped") === oldName ? { ...i, svc: { ...i.svc, group: name } } : i,
      ),
    );
    setEmptyGroups((cur) => cur.map((g) => (g === oldName ? name : g)));
  };

  const addGroup = () => {
    setEmptyGroups((cur) => {
      const existing = new Set([...groupNames, ...cur]);
      let name = "New Group";
      let n = 2;
      while (existing.has(name)) name = `New Group ${n++}`;
      return [...cur, name];
    });
  };

  const removeEmptyGroup = (name: string) => setEmptyGroups((cur) => cur.filter((g) => g !== name));

  const moveDraft = (uid: string, targetGroup: string, beforeUid: string | null) => {
    if (beforeUid === uid) return;
    setDraft((cur) => {
      const item = cur.find((i) => i.uid === uid);
      if (!item) return cur;
      const moved: Draft = { ...item, svc: { ...item.svc, group: targetGroup } };
      const without = cur.filter((i) => i.uid !== uid);
      if (beforeUid == null) {
        let lastIdx = -1;
        without.forEach((i, idx) => {
          if ((i.svc.group || "Ungrouped") === targetGroup) lastIdx = idx;
        });
        if (lastIdx === -1) without.push(moved);
        else without.splice(lastIdx + 1, 0, moved);
      } else {
        const i = without.findIndex((x) => x.uid === beforeUid);
        if (i === -1) without.push(moved);
        else without.splice(i, 0, moved);
      }
      return without;
    });
    setEmptyGroups((cur) => cur.filter((g) => g !== targetGroup));
  };

  const finishDrag = () => {
    setDragUid(null);
    setDropTarget(null);
  };

  const closeEditor = () => {
    const uid = editorUid;
    if (uid && newUids.has(uid)) {
      const it = draft.find((i) => i.uid === uid);
      // Drop a freshly-added card the user opened but left blank.
      if (it && !it.svc.name.trim() && !it.svc.domain.trim() && !it.svc.localHost?.trim()) {
        setDraft((cur) => cur.filter((i) => i.uid !== uid));
      }
    }
    setEditorUid(null);
  };

  // ── Import / Export ────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(orderedDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homelab-services-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array");
      uidRef.current = 0;
      setDraft((parsed as Service[]).map((svc) => ({ uid: nextUid(), svc })));
      setEmptyGroups([]);
      setNewUids(new Set());
      toast.success(`Imported ${parsed.length} services`);
    } catch (e) {
      toast.error(e instanceof Error ? `Import failed: ${e.message}` : "Import failed");
    }
  };

  const time = now
    ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";
  const date = now
    ? now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    : "";

  const editorItem = editorUid ? draft.find((i) => i.uid === editorUid) : null;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Sticky edit toolbar */}
      {editMode && (
        <div className="sticky top-0 z-30 -mx-4 mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-[oklch(0.16_0.02_265)]/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Pencil className="h-4 w-4 text-primary" />
            Editing
            {dirty && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-300">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground hover:bg-white/5"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground hover:bg-white/5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-4 sm:items-end">
          {!editMode && (
            <button
              onClick={() => {
                setLoginError(null);
                setLoginOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title="Edit dashboard"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
          <div className="text-right">
            <div className="font-mono text-4xl font-light tabular-nums text-foreground sm:text-5xl">
              {time}
            </div>
          </div>
        </div>
      </header>

      {!editMode && (
        <div className="glass-card mb-10 flex items-center gap-3 rounded-2xl px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            {displayGrouped.count} / {services.length}
          </kbd>
        </div>
      )}

      {/* ── Display mode ─────────────────────────────────────────── */}
      {!editMode && (
        <div className="space-y-10 pb-16">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
            </div>
          )}
          {loadError && !loading && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
              Failed to load services: {loadError}
            </div>
          )}
          {displayGrouped.entries.map(([group, items]) => {
            const colors = assignGroupColors(items);
            return (
              <section key={group}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {group}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-[10px] text-muted-foreground/60">{items.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((s, i) => (
                    <ServiceCard key={s.id} service={s} color={colors[i]} />
                  ))}
                </div>
              </section>
            );
          })}
          {!loading && !loadError && displayGrouped.entries.length === 0 && (
            <div className="py-20 text-center text-sm text-muted-foreground">
              {services.length === 0
                ? "No services yet. Click Edit to add some."
                : `No services match "${query}"`}
            </div>
          )}
        </div>
      )}

      {/* ── Edit mode ────────────────────────────────────────────── */}
      {editMode && (
        <div className="space-y-10 pb-16">
          {editGroups.map((group) => {
            const colors = assignGroupColors(group.items.map((it) => it.svc));
            return (
              <section
                key={group.name}
                onDragOver={(e) => {
                  if (dragUid === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropTarget((cur) =>
                    cur && cur.group === group.name && cur.beforeUid === null
                      ? cur
                      : { group: group.name, beforeUid: null },
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragUid !== null && dropTarget)
                    moveDraft(dragUid, dropTarget.group, dropTarget.beforeUid);
                  finishDrag();
                }}
                className={`rounded-2xl border p-3 transition-colors ${
                  dragUid !== null && dropTarget?.group === group.name
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-transparent"
                }`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <input
                    value={group.name}
                    onChange={(e) => renameGroup(group.name, e.target.value)}
                    className="min-w-0 rounded-md bg-transparent px-1 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground outline-none focus:bg-black/30 focus:text-foreground"
                    title="Rename group"
                  />
                  <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-[10px] text-muted-foreground/60">{group.items.length}</span>
                  {group.items.length === 0 && (
                    <button
                      onClick={() => removeEmptyGroup(group.name)}
                      className="rounded-md p-1 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                      title="Remove empty group"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {group.items.map((it, i) => (
                    <ServiceCard
                      key={it.uid}
                      service={it.svc}
                      color={colors[i]}
                      editing
                      onEdit={() => setEditorUid(it.uid)}
                      onDelete={() => removeDraft(it.uid)}
                      isDragging={dragUid === it.uid}
                      showDropIndicator={
                        dragUid !== null &&
                        dropTarget?.group === group.name &&
                        dropTarget.beforeUid === it.uid
                      }
                      onDragStart={(e) => {
                        setDragUid(it.uid);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        if (dragUid === null) return;
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = "move";
                        setDropTarget((cur) =>
                          cur && cur.group === group.name && cur.beforeUid === it.uid
                            ? cur
                            : { group: group.name, beforeUid: it.uid },
                        );
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragUid !== null) moveDraft(dragUid, group.name, it.uid);
                        finishDrag();
                      }}
                      onDragEnd={finishDrag}
                    />
                  ))}
                  {/* Add-service tile */}
                  <button
                    onClick={() => addToGroup(group.name)}
                    className="flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    title="Add service to this group"
                  >
                    <Plus className="h-7 w-7" />
                    <span className="text-xs">Add</span>
                  </button>
                </div>
              </section>
            );
          })}

          <button
            onClick={addGroup}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            <FolderPlus className="h-4 w-4" /> New group
          </button>
        </div>
      )}

      {/* Login modal */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setLoginOpen(false)}
        >
          <div className="glass-card flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-white/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter admin password to edit the dashboard.
            </p>
            <input
              autoFocus
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loginPassword && !loginBusy && doLogin()}
              placeholder="Password"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
            />
            {loginError && <p className="text-xs text-rose-400">{loginError}</p>}
            <div className="flex w-full gap-2">
              <button
                onClick={() => setLoginOpen(false)}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                disabled={!loginPassword || loginBusy}
                onClick={doLogin}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-service editor */}
      {editorItem && (
        <ServiceEditorModal
          service={editorItem.svc}
          isNew={newUids.has(editorItem.uid)}
          existingGroups={groupNames}
          onChange={(svc) => updateDraft(editorItem.uid, svc)}
          onDuplicate={() => duplicateDraft(editorItem.uid)}
          onDelete={() => removeDraft(editorItem.uid)}
          onClose={closeEditor}
        />
      )}
    </main>
  );
}

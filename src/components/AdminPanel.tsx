import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Save,
  Lock,
  GripVertical,
  Download,
  Upload,
  FolderPlus,
} from "lucide-react";
import type { Protocol, Service } from "@/lib/services-config";
import { saveServices } from "@/lib/services-config";

type Props = {
  open: boolean;
  onClose: () => void;
  services: Service[];
  onSaved: (services: Service[]) => void;
};

/** A service plus a stable key so drag/edit survive id changes & duplicates. */
type Row = { key: string; svc: Service };

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

export function AdminPanel({ open, onClose, services, onSaved }: Props) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [extraGroups, setExtraGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag state. dragKey = row being dragged; dropTarget = where it would land.
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ group: string; beforeKey: string | null } | null>(
    null,
  );
  // Only a real grab on the handle is allowed to start a drag (so inputs stay usable).
  const handleArmed = useRef(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);
  const nextKey = () => `r${keyRef.current++}`;

  useEffect(() => {
    if (open) {
      keyRef.current = 0;
      setRows(services.map((svc) => ({ key: nextKey(), svc })));
      setExtraGroups([]);
      setError(null);
      setDragKey(null);
      setDropTarget(null);
    }
  }, [open, services]);

  // Ordered groups, derived from row order (first appearance wins), plus any
  // empty groups the user just created.
  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, Row[]>();
    for (const row of rows) {
      const g = row.svc.group || "Ungrouped";
      if (!byGroup.has(g)) {
        byGroup.set(g, []);
        order.push(g);
      }
      byGroup.get(g)!.push(row);
    }
    for (const g of extraGroups) {
      if (!byGroup.has(g)) {
        byGroup.set(g, []);
        order.push(g);
      }
    }
    return order.map((name) => ({ name, rows: byGroup.get(name) ?? [] }));
  }, [rows, extraGroups]);

  if (!open) return null;

  const updateField = <K extends keyof Service>(key: string, field: K, value: Service[K]) => {
    setRows((cur) =>
      cur.map((r) => (r.key === key ? { ...r, svc: { ...r.svc, [field]: value } } : r)),
    );
  };

  const addServiceToGroup = (group: string) => {
    setRows((cur) => {
      const row: Row = {
        key: nextKey(),
        svc: { ...EMPTY, id: `service-${cur.length + 1}-${keyRef.current}`, group },
      };
      // Insert right after the last row of this group so it lands where expected.
      let lastIdx = -1;
      cur.forEach((r, i) => {
        if ((r.svc.group || "Ungrouped") === group) lastIdx = i;
      });
      if (lastIdx === -1) return [...cur, row];
      const next = [...cur];
      next.splice(lastIdx + 1, 0, row);
      return next;
    });
  };

  const removeRow = (key: string) => {
    setRows((cur) => cur.filter((r) => r.key !== key));
  };

  const renameGroup = (oldName: string, newName: string) => {
    const trimmed = newName;
    setRows((cur) =>
      cur.map((r) =>
        (r.svc.group || "Ungrouped") === oldName
          ? { ...r, svc: { ...r.svc, group: trimmed || "Ungrouped" } }
          : r,
      ),
    );
    setExtraGroups((cur) => cur.map((g) => (g === oldName ? trimmed || "Ungrouped" : g)));
  };

  const addGroup = () => {
    setExtraGroups((cur) => {
      const base = "New Group";
      let name = base;
      let n = 2;
      const existing = new Set([...groups.map((g) => g.name), ...cur]);
      while (existing.has(name)) name = `${base} ${n++}`;
      return [...cur, name];
    });
  };

  const removeEmptyGroup = (name: string) => {
    setExtraGroups((cur) => cur.filter((g) => g !== name));
  };

  const moveRow = (key: string, targetGroup: string, beforeKey: string | null) => {
    setRows((cur) => {
      const item = cur.find((r) => r.key === key);
      if (!item) return cur;
      if (beforeKey === key) return cur;
      const moved: Row = { ...item, svc: { ...item.svc, group: targetGroup } };
      const without = cur.filter((r) => r.key !== key);
      if (beforeKey == null) {
        let lastIdx = -1;
        without.forEach((r, i) => {
          if ((r.svc.group || "Ungrouped") === targetGroup) lastIdx = i;
        });
        if (lastIdx === -1) without.push(moved);
        else without.splice(lastIdx + 1, 0, moved);
      } else {
        const i = without.findIndex((r) => r.key === beforeKey);
        if (i === -1) without.push(moved);
        else without.splice(i, 0, moved);
      }
      return without;
    });
    // The target group now has a service, so drop it from the empty-group list.
    setExtraGroups((cur) => cur.filter((g) => g !== targetGroup));
  };

  const finishDrag = () => {
    setDragKey(null);
    setDropTarget(null);
    handleArmed.current = false;
  };

  const handleExport = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          rows.map((r) => r.svc),
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
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
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array");
      keyRef.current = 0;
      setRows((parsed as Service[]).map((svc) => ({ key: nextKey(), svc })));
      setExtraGroups([]);
    } catch (e) {
      setError(e instanceof Error ? `Import failed: ${e.message}` : "Import failed");
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      // Save grouped: services contiguous by group, in the on-screen order.
      const ordered = groups.flatMap((g) => g.rows.map((r) => r.svc));
      await saveServices(ordered, password);
      onSaved(ordered);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      if (e instanceof Error && e.message === "Invalid password") {
        setAuthed(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const total = rows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-card relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {authed ? "Manage Services" : "Admin Access"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {!authed ? (
          <div className="flex flex-col items-center gap-4 p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-1 ring-white/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Enter admin password to edit services.</p>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && password && setAuthed(true)}
              placeholder="Password"
              className="w-72 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button
              disabled={!password}
              onClick={() => setAuthed(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Continue
            </button>
            <p className="text-[10px] text-muted-foreground/60">
              Password is verified server-side on Save.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {groups.map((group) => {
                  const isDropGroup = dropTarget?.group === group.name && dragKey !== null;
                  return (
                    <section
                      key={group.name}
                      onDragOver={(e) => {
                        if (dragKey === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        // Hovering the section (not a specific row) → append to end.
                        setDropTarget((cur) =>
                          cur && cur.group === group.name && cur.beforeKey !== null
                            ? cur
                            : { group: group.name, beforeKey: null },
                        );
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragKey !== null && dropTarget)
                          moveRow(dragKey, dropTarget.group, dropTarget.beforeKey);
                        finishDrag();
                      }}
                      className={`rounded-xl border p-3 transition-colors ${
                        isDropGroup
                          ? "border-primary/50 bg-primary/[0.04]"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <input
                          value={group.name}
                          onChange={(e) => renameGroup(group.name, e.target.value)}
                          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground outline-none focus:bg-black/30 focus:text-foreground"
                          title="Rename group (applies to all its services)"
                        />
                        <span className="shrink-0 text-[10px] text-muted-foreground/60">
                          {group.rows.length}
                        </span>
                        <button
                          onClick={() => addServiceToGroup(group.name)}
                          className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary"
                          title="Add service to this group"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                        {group.rows.length === 0 && (
                          <button
                            onClick={() => removeEmptyGroup(group.name)}
                            className="shrink-0 rounded-md p-1 text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400"
                            title="Remove empty group"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {group.rows.length === 0 && (
                          <div className="rounded-lg border border-dashed border-white/10 py-4 text-center text-[11px] text-muted-foreground/60">
                            Drop a service here or press Add
                          </div>
                        )}
                        {group.rows.map((row) => {
                          const showLineBefore =
                            dragKey !== null &&
                            dropTarget?.group === group.name &&
                            dropTarget.beforeKey === row.key;
                          return (
                            <div
                              key={row.key}
                              draggable
                              onDragStart={(e) => {
                                if (!handleArmed.current) {
                                  e.preventDefault();
                                  return;
                                }
                                setDragKey(row.key);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(e) => {
                                if (dragKey === null) return;
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = "move";
                                setDropTarget((cur) =>
                                  cur && cur.group === group.name && cur.beforeKey === row.key
                                    ? cur
                                    : { group: group.name, beforeKey: row.key },
                                );
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (dragKey !== null) moveRow(dragKey, group.name, row.key);
                                finishDrag();
                              }}
                              onDragEnd={finishDrag}
                              className={`rounded-xl border bg-black/20 p-3 transition-colors ${
                                showLineBefore
                                  ? "border-t-2 border-t-primary border-white/10"
                                  : "border-white/10"
                              } ${dragKey === row.key ? "opacity-40" : ""}`}
                            >
                              <div className="flex flex-col gap-2">
                                {/* Identity row */}
                                <div className="flex items-center gap-2">
                                  <span
                                    onMouseDown={() => {
                                      handleArmed.current = true;
                                    }}
                                    onMouseUp={() => {
                                      handleArmed.current = false;
                                    }}
                                    className="flex cursor-grab touch-none items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                    title="Drag to reorder / move between groups"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </span>
                                  <Field
                                    label="Name"
                                    value={row.svc.name}
                                    onChange={(v) => updateField(row.key, "name", v)}
                                    className="flex-1"
                                  />
                                  <Field
                                    label="ID"
                                    value={row.svc.id}
                                    onChange={(v) => updateField(row.key, "id", v)}
                                    className="w-28"
                                  />
                                  <Field
                                    label="Icon"
                                    value={row.svc.icon}
                                    onChange={(v) => updateField(row.key, "icon", v)}
                                    hint="lucide.dev"
                                    className="w-28"
                                  />
                                  <label className="flex w-12 shrink-0 flex-col items-center gap-1">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                      VPS
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={row.svc.isVps}
                                      onChange={(e) =>
                                        updateField(row.key, "isVps", e.target.checked)
                                      }
                                      className="h-5 w-5 accent-primary"
                                      title="Ping this service for online status"
                                    />
                                  </label>
                                  <button
                                    onClick={() => removeRow(row.key)}
                                    className="mt-4 shrink-0 rounded-md p-2 text-rose-400 hover:bg-rose-500/10"
                                    title="Delete service"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Local access row */}
                                <div className="flex flex-wrap items-end gap-2">
                                  <span className="w-12 shrink-0 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400/70">
                                    Local
                                  </span>
                                  <ProtoSelect
                                    value={row.svc.localProtocol ?? "http"}
                                    onChange={(v) => updateField(row.key, "localProtocol", v)}
                                  />
                                  <Field
                                    label="Host / IP"
                                    value={row.svc.localHost || ""}
                                    onChange={(v) => updateField(row.key, "localHost", v)}
                                    hint="blank = this host"
                                    className="min-w-[8rem] flex-1"
                                  />
                                  <Field
                                    label="Port"
                                    type="number"
                                    value={String(row.svc.localPort ?? "")}
                                    onChange={(v) =>
                                      updateField(row.key, "localPort", Number(v) || 0)
                                    }
                                    className="w-20"
                                  />
                                </div>

                                {/* Remote access row */}
                                <div className="flex flex-wrap items-end gap-2">
                                  <span className="w-12 shrink-0 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-sky-400/70">
                                    Remote
                                  </span>
                                  <ProtoSelect
                                    value={row.svc.remoteProtocol ?? "https"}
                                    onChange={(v) => updateField(row.key, "remoteProtocol", v)}
                                  />
                                  <Field
                                    label="Domain"
                                    value={row.svc.domain}
                                    onChange={(v) => updateField(row.key, "domain", v)}
                                    className="min-w-[8rem] flex-1"
                                  />
                                  <Field
                                    label="Port"
                                    type="number"
                                    value={row.svc.remotePort ? String(row.svc.remotePort) : ""}
                                    onChange={(v) =>
                                      updateField(row.key, "remotePort", Number(v) || 0)
                                    }
                                    hint="optional"
                                    className="w-20"
                                  />
                                </div>

                                {/* Shared row */}
                                <div className="flex flex-wrap items-end gap-2">
                                  <span className="w-12 shrink-0" />
                                  <Field
                                    label="Path"
                                    value={row.svc.localPath}
                                    onChange={(v) => updateField(row.key, "localPath", v)}
                                    className="w-32"
                                  />
                                  <Field
                                    label="Description"
                                    value={row.svc.description || ""}
                                    onChange={(v) => updateField(row.key, "description", v)}
                                    className="min-w-[8rem] flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                <button
                  onClick={addGroup}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  <FolderPlus className="h-4 w-4" /> Add group
                </button>
              </div>
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
              <span className="text-xs text-muted-foreground">
                {total} service{total === 1 ? "" : "s"} · {groups.length} group
                {groups.length === 1 ? "" : "s"}
                {error && <span className="ml-3 text-rose-400">{error}</span>}
              </span>
              <div className="flex flex-wrap gap-2">
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
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground hover:bg-white/5"
                  title="Import JSON"
                >
                  <Upload className="h-4 w-4" /> Import
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground hover:bg-white/5"
                  title="Export JSON"
                >
                  <Download className="h-4 w-4" /> Export
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function ProtoSelect({ value, onChange }: { value: Protocol; onChange: (v: Protocol) => void }) {
  return (
    <label className="flex shrink-0 flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Proto</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Protocol)}
        className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/60"
      >
        <option value="http">http</option>
        <option value="https">https</option>
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {hint === "lucide.dev" && (
          <a
            href="https://lucide.dev/icons/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/70 hover:text-primary"
            title="Browse icons"
          >
            ↗
          </a>
        )}
        {hint && hint !== "lucide.dev" && (
          <span className="text-muted-foreground/50">({hint})</span>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/60"
      />
    </label>
  );
}

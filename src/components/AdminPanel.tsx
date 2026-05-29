import { useEffect, useState } from "react";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X, Save, Lock, GripVertical, Download, Upload } from "lucide-react";
import type { Service } from "@/lib/services-config";
import { saveServices } from "@/lib/services-config";

type Props = {
  open: boolean;
  onClose: () => void;
  services: Service[];
  onSaved: (services: Service[]) => void;
};

const EMPTY: Service = {
  id: "",
  name: "",
  group: "System",
  icon: "Box",
  localPort: 80,
  localPath: "/",
  domain: "",
  isVps: false,
  description: "",
  protocol: "http",
  localHost: "",
};

export function AdminPanel({ open, onClose, services, onSaved }: Props) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [list, setList] = useState<Service[]>(services);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setList(services);
      setError(null);
    }
  }, [open, services]);

  if (!open) return null;

  const updateField = <K extends keyof Service>(idx: number, key: K, value: Service[K]) => {
    setList((cur) => cur.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  };

  const addService = () => {
    setList((cur) => [...cur, { ...EMPTY, id: `service-${Date.now()}` }]);
  };

  const removeService = (idx: number) => {
    setList((cur) => cur.filter((_, i) => i !== idx));
  };

  const moveItem = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setList((cur) => {
      const next = [...cur];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
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
      setList(parsed as Service[]);
    } catch (e) {
      setError(e instanceof Error ? `Import failed: ${e.message}` : "Import failed");
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await saveServices(list, password);
      onSaved(list);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-card relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {authed ? "Manage Services" : "Admin Access"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground">
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
              <div className="space-y-3">
                {list.map((svc, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => {
                      setDragIdx(idx);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (overIdx !== idx) setOverIdx(idx);
                    }}
                    onDragLeave={() => setOverIdx((cur) => (cur === idx ? null : cur))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIdx !== null) moveItem(dragIdx, idx);
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    className={`grid grid-cols-1 gap-2 rounded-xl border bg-black/20 p-3 transition-colors md:grid-cols-12 ${
                      overIdx === idx && dragIdx !== null && dragIdx !== idx
                        ? "border-primary/60 bg-primary/5"
                        : "border-white/10"
                    } ${dragIdx === idx ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-center md:col-span-1">
                      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing" />
                    </div>
                    <Field label="ID" value={svc.id} onChange={(v) => updateField(idx, "id", v)} className="md:col-span-2" />
                    <Field label="Name" value={svc.name} onChange={(v) => updateField(idx, "name", v)} className="md:col-span-2" />
                    <Field label="Group" value={svc.group} onChange={(v) => updateField(idx, "group", v)} className="md:col-span-1" />
                    <Field
                      label="Icon"
                      value={svc.icon}
                      onChange={(v) => updateField(idx, "icon", v)}
                      hint="lucide.dev"
                      className="md:col-span-1"
                    />
                    <label className="flex flex-col gap-1 md:col-span-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Proto</span>
                      <select
                        value={svc.protocol ?? "http"}
                        onChange={(e) => updateField(idx, "protocol", e.target.value as "http" | "https")}
                        className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/60"
                      >
                        <option value="http">http</option>
                        <option value="https">https</option>
                      </select>
                    </label>
                    <Field
                      label="Port"
                      type="number"
                      value={String(svc.localPort)}
                      onChange={(v) => updateField(idx, "localPort", Number(v) || 0)}
                      className="md:col-span-1"
                    />
                    <Field label="Path" value={svc.localPath} onChange={(v) => updateField(idx, "localPath", v)} className="md:col-span-1" />
                    <Field
                      label="Local IP"
                      value={svc.localHost || ""}
                      onChange={(v) => updateField(idx, "localHost", v)}
                      hint="optional"
                      className="md:col-span-1"
                    />
                    <Field label="Domain" value={svc.domain} onChange={(v) => updateField(idx, "domain", v)} className="md:col-span-1" />
                    <Field label="Description" value={svc.description || ""} onChange={(v) => updateField(idx, "description", v)} className="md:col-span-1" />
                    <div className="flex items-end justify-between gap-2 md:col-span-1">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">VPS</span>
                        <input
                          type="checkbox"
                          checked={svc.isVps}
                          onChange={(e) => updateField(idx, "isVps", e.target.checked)}
                          className="h-5 w-5 accent-primary"
                        />
                      </label>
                      <button
                        onClick={() => removeService(idx)}
                        className="rounded-md p-2 text-rose-400 hover:bg-rose-500/10"
                        title="Delete service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addService}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  <Plus className="h-4 w-4" /> Add service
                </button>
              </div>
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
              <span className="text-xs text-muted-foreground">
                {list.length} service{list.length === 1 ? "" : "s"}
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
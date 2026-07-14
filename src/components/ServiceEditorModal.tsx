import { useEffect, useMemo, useRef, useState } from "react";
import { X, Trash2, Copy, Check, Wifi, Globe, ChevronDown, Plus } from "lucide-react";
import type { Protocol, Service } from "@/lib/services-config";
import { previewUrls } from "@/lib/services-config";
import { IconPicker } from "@/components/IconPicker";

type Props = {
  service: Service;
  isNew: boolean;
  existingGroups: string[];
  onChange: (svc: Service) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ServiceEditorModal({
  service,
  isNew,
  existingGroups,
  onChange,
  onDuplicate,
  onDelete,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Service>(key: K, value: Service[K]) =>
    onChange({ ...service, [key]: value });

  const urls = previewUrls(service);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {isNew ? "New service" : `Edit · ${service.name || service.id || "service"}`}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={service.name} onChange={(v) => set("name", v)} />
            <Field label="ID" value={service.id} onChange={(v) => set("id", v)} hint="unique" />
            <IconPicker value={service.icon} onChange={(v) => set("icon", v)} />
            <GroupField
              value={service.group}
              existing={existingGroups}
              onChange={(v) => set("group", v)}
            />
            <Field
              label="Description"
              value={service.description || ""}
              onChange={(v) => set("description", v)}
              className="col-span-2"
            />
          </div>

          {/* Local access */}
          <fieldset className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.03] p-3">
            <legend className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-emerald-400/80">
              <Wifi className="h-3 w-3" /> Local
            </legend>
            <div className="grid grid-cols-[auto_1fr_auto] gap-2">
              <ProtoSelect
                value={service.localProtocol ?? "http"}
                onChange={(v) => set("localProtocol", v)}
              />
              <Field
                label="Host / IP"
                value={service.localHost || ""}
                onChange={(v) => set("localHost", v)}
                hint="blank = this host"
              />
              <Field
                label="Port"
                type="number"
                value={service.localPort ? String(service.localPort) : ""}
                onChange={(v) => set("localPort", Number(v) || 0)}
                className="w-20"
              />
            </div>
          </fieldset>

          {/* Remote access */}
          <fieldset className="rounded-xl border border-sky-400/20 bg-sky-400/[0.03] p-3">
            <legend className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-sky-400/80">
              <Globe className="h-3 w-3" /> Remote
            </legend>
            <div className="grid grid-cols-[auto_1fr_auto] gap-2">
              <ProtoSelect
                value={service.remoteProtocol ?? "https"}
                onChange={(v) => set("remoteProtocol", v)}
              />
              <Field label="Domain" value={service.domain} onChange={(v) => set("domain", v)} />
              <Field
                label="Port"
                type="number"
                value={service.remotePort ? String(service.remotePort) : ""}
                onChange={(v) => set("remotePort", Number(v) || 0)}
                hint="optional"
                className="w-20"
              />
            </div>
          </fieldset>

          {/* Shared */}
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <Field
              label="Path"
              value={service.localPath}
              onChange={(v) => set("localPath", v)}
              hint="added to both"
            />
            <label className="flex cursor-pointer items-center gap-2 pb-1.5">
              <input
                type="checkbox"
                checked={service.isVps}
                onChange={(e) => set("isVps", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-xs text-muted-foreground">Ping</span>
            </label>
          </div>

          {/* Live URL preview */}
          <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Opens</p>
            <div className="flex items-center gap-2 text-xs">
              <Wifi className="h-3 w-3 shrink-0 text-emerald-400/80" />
              <span className="truncate font-mono text-emerald-300/90">{urls.local}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Globe className="h-3 w-3 shrink-0 text-sky-400/80" />
              <span className="truncate font-mono text-sky-300/90">{urls.remote}</span>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onDuplicate}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-foreground hover:bg-white/5"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Check className="h-3.5 w-3.5" /> Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ProtoSelect({ value, onChange }: { value: Protocol; onChange: (v: Protocol) => void }) {
  return (
    <label className="flex flex-col gap-1">
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

function GroupField({
  value,
  existing,
  onChange,
}: {
  value: string;
  existing: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = value.trim().toLowerCase();
  const exactMatch = existing.some((g) => g.toLowerCase() === q);
  // Show the full list when the value is empty or already a group (nothing to
  // narrow); only filter while the user is typing a genuinely new name.
  const matches = useMemo(
    () => (exactMatch || q === "" ? existing : existing.filter((g) => g.toLowerCase().includes(q))),
    [existing, q, exactMatch],
  );
  // Offer to create a new group when the typed value doesn't already exist.
  const isNew = value.trim().length > 0 && !exactMatch;

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Group</span>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Choose or type…"
          className="w-full rounded-md border border-white/10 bg-black/30 py-1.5 pl-2 pr-7 text-xs text-foreground outline-none focus:border-primary/60"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 flex w-7 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (matches.length > 0 || isNew) && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[oklch(0.2_0.025_265)] p-1 shadow-2xl">
          {isNew && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-primary hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              Create “{value.trim()}”
            </button>
          )}
          {matches.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                onChange(g);
                setOpen(false);
              }}
              className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/5 ${
                g.toLowerCase() === q ? "text-primary" : "text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
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
        {hint && <span className="text-muted-foreground/50">({hint})</span>}
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

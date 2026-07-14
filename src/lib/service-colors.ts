import type { Service } from "./services-config";

export type ServicePalette = { key: string; label: string; rgb: string; fg: string };

/** Icon-tile palette, tuned to read well on the dark glass cards. */
export const SERVICE_COLORS: ServicePalette[] = [
  { key: "purple", label: "Purple", rgb: "139,124,246", fg: "#bcafff" },
  { key: "blue", label: "Blue", rgb: "55,138,221", fg: "#82b7ef" },
  { key: "teal", label: "Teal", rgb: "29,158,117", fg: "#5fd3ad" },
  { key: "cyan", label: "Cyan", rgb: "45,190,210", fg: "#6fd6e6" },
  { key: "green", label: "Green", rgb: "151,196,89", fg: "#bce08e" },
  { key: "amber", label: "Amber", rgb: "239,159,39", fg: "#f2b45a" },
  { key: "coral", label: "Coral", rgb: "216,90,48", fg: "#f2a184" },
  { key: "pink", label: "Pink", rgb: "212,83,126", fg: "#ef97b6" },
];

const BY_KEY = new Map(SERVICE_COLORS.map((c) => [c.key, c]));

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type ResolvedColor = { key: string; bg: string; fg: string; ring: string; auto: boolean };

function colorFromKey(key: string, auto: boolean): ResolvedColor {
  const p = BY_KEY.get(key)!;
  return { key, bg: `rgba(${p.rgb},0.16)`, fg: p.fg, ring: `rgba(${p.rgb},0.34)`, auto };
}

type ColorInput = Pick<Service, "id" | "name" | "color">;

function autoKey(svc: ColorInput): string {
  return SERVICE_COLORS[hashStr(svc.id || svc.name || "x") % SERVICE_COLORS.length].key;
}

/** Standalone color for a single service: manual override if valid, else a stable auto-pick from the id. */
export function resolveServiceColor(svc: ColorInput): ResolvedColor {
  const manual = svc.color && BY_KEY.has(svc.color) ? svc.color : null;
  return colorFromKey(manual ?? autoKey(svc), !manual);
}

/**
 * Colors for a whole group, guaranteeing distinct auto colors within it (no two
 * neighbours share a color until the group outgrows the palette). Manual
 * overrides are honored and reserved first so auto picks route around them.
 * Returns colors aligned with the input order.
 */
export function assignGroupColors(items: ColorInput[]): ResolvedColor[] {
  const n = SERVICE_COLORS.length;
  const manual = items.map((it) => (it.color && BY_KEY.has(it.color) ? it.color : null));
  const used = new Set<string>(manual.filter((k): k is string => !!k));
  return items.map((it, i) => {
    if (manual[i]) return colorFromKey(manual[i]!, false);
    const start = hashStr(it.id || it.name || "x") % n;
    let key = SERVICE_COLORS[start].key;
    for (let step = 0; step < n; step++) {
      const cand = SERVICE_COLORS[(start + step) % n].key;
      if (!used.has(cand)) {
        key = cand;
        break;
      }
    }
    used.add(key);
    return colorFromKey(key, true);
  });
}

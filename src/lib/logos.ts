import type { Service } from "./services-config";
import { LOGO_SLUGS, LOGO_ALIASES } from "./logos.generated";

const SLUG_SET = new Set(LOGO_SLUGS);

export { LOGO_SLUGS };

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function logoUrl(slug: string): string {
  return `/logos/${slug}.svg`;
}

/** Resolves a slug or alias to a real logo slug, or null if unknown. */
export function canonicalSlug(slug: string): string | null {
  if (SLUG_SET.has(slug)) return slug;
  return LOGO_ALIASES[slug] ?? null;
}

/** Brand logo auto-detected from the service id, then name. Null when nothing matches. */
export function autoLogoSlug(svc: Pick<Service, "id" | "name">): string | null {
  return canonicalSlug(slugify(svc.id || "")) ?? canonicalSlug(slugify(svc.name || "")) ?? null;
}

export type IconRender =
  | { kind: "logo"; src: string; slug: string }
  | { kind: "url"; src: string }
  | { kind: "lucide"; name: string };

/**
 * Decides what to render for a service's icon.
 * - `logo:<slug>`  → that brand logo (explicit)
 * - `lucide:<Name>`→ that lucide glyph (explicit opt-out of auto-logo)
 * - `http(s)://…`  → external image
 * - anything else (plain lucide name or empty) → auto brand logo if the
 *   id/name matches, otherwise the lucide glyph (or Box).
 */
export function resolveIcon(svc: Pick<Service, "id" | "name" | "icon">): IconRender {
  const icon = svc.icon || "";
  if (icon.startsWith("logo:")) {
    const raw = icon.slice(5);
    const slug = canonicalSlug(raw) ?? raw;
    return { kind: "logo", src: logoUrl(slug), slug };
  }
  if (icon.startsWith("lucide:")) return { kind: "lucide", name: icon.slice(7) || "Box" };
  if (/^https?:\/\//i.test(icon)) return { kind: "url", src: icon };
  const auto = autoLogoSlug(svc);
  if (auto) return { kind: "logo", src: logoUrl(auto), slug: auto };
  return { kind: "lucide", name: icon || "Box" };
}

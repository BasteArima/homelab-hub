import { promises as fs } from "node:fs";
import path from "node:path";
import type { Service } from "./services-config";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "services.json");

const DEFAULTS: Service[] = [
  { id: "example", name: "Example Service", group: "System", icon: "Box", localPort: 8080, localPath: "/", domain: "example.local", isVps: false, description: "Edit me from the admin panel" },
];

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULTS, null, 2), "utf8");
  }
}

export async function readServices(): Promise<Service[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Service[];
    return [];
  } catch {
    return [];
  }
}

export async function writeServices(services: Service[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(services, null, 2), "utf8");
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin123";
}
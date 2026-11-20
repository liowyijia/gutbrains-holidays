import { env } from "cloudflare:workers";
import { DAYS, type Responsibility } from "@/lib/calendar";

export const dynamic = "force-dynamic";
const daySet = new Set(DAYS);
const externalOrigins = new Set(["https://liowyijia.github.io", "https://yijialiow.com"]);
type Stored = { id: string; profile_id: string; title: string; start_date: string; end_date: string; notes: string; revision: number; updated_at: string };
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function publicRow(row: Stored): Responsibility {
  return { id: row.id, profileId: row.profile_id, title: row.title, startDate: row.start_date, endDate: row.end_date, notes: row.notes, revision: row.revision, updatedAt: row.updated_at };
}
function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && (origin === new URL(request.url).origin || externalOrigins.has(origin));
}
function cors(response: Response, request: Request) {
  response.headers.set("Vary", "Origin");
  const origin = request.headers.get("origin");
  if (origin && externalOrigins.has(origin)) response.headers.set("Access-Control-Allow-Origin", origin);
  return response;
}
async function body(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  const text = await request.text();
  if (text.length > 6000) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}
function validate(raw: Record<string, unknown> | null) {
  if (!raw) return null;
  const { profileId, title, startDate, endDate, notes = "" } = raw;
  if (typeof profileId !== "string" || typeof title !== "string" || typeof notes !== "string" || typeof startDate !== "string" || typeof endDate !== "string") return null;
  const cleanTitle = title.trim().normalize("NFKC");
  if (!cleanTitle || cleanTitle.length > 120 || /[\p{C}]/u.test(cleanTitle) || notes.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(notes) || !daySet.has(startDate) || !daySet.has(endDate) || endDate < startDate) return null;
  return { profileId, title: cleanTitle, startDate, endDate, notes: notes.trim() };
}
async function read() {
  const result = await env.DB!.prepare("SELECT * FROM responsibilities ORDER BY start_date, end_date, title, id").all<Stored>();
  return json({ responsibilities: result.results.map(publicRow) });
}
async function write(request: Request) {
  if (!allowedOrigin(request)) return json({ error: "Please save from this calendar's website." }, 403);
  const raw = await body(request);
  if (request.method === "DELETE") {
    if (!raw || typeof raw.id !== "string" || typeof raw.profileId !== "string" || !Number.isInteger(raw.revision) || Number(raw.revision) < 1) return json({ error: "The responsibility is invalid. Reload the list and try again." }, 400);
    const result = await env.DB!.prepare("DELETE FROM responsibilities WHERE id = ? AND profile_id = ? AND revision = ?").bind(raw.id, raw.profileId, raw.revision).run();
    return result.meta.changes ? json({ deleted: true }) : json({ error: "This responsibility changed or was removed. Refresh the list before trying again." }, 409);
  }
  const input = validate(raw);
  if (!input) return json({ error: "Enter a title (1–120 characters), a profile, and valid dates within the holiday period. Notes can contain up to 1,000 characters." }, 400);
  const profile = await env.DB!.prepare("SELECT id FROM responses WHERE id = ?").bind(input.profileId).first();
  if (!profile) return json({ error: "Save or select your profile before adding responsibilities." }, 404);
  const updatedAt = new Date().toISOString();
  if (request.method === "POST") {
    const id = crypto.randomUUID();
    const result = await env.DB!.prepare("INSERT INTO responsibilities (id, profile_id, title, start_date, end_date, notes, revision, updated_at) SELECT ?, ?, ?, ?, ?, ?, 1, ? WHERE (SELECT COUNT(*) FROM responsibilities WHERE profile_id = ?) < 100")
      .bind(id, input.profileId, input.title, input.startDate, input.endDate, input.notes, updatedAt, input.profileId).run();
    if (!result.meta.changes) return json({ error: "This profile has reached its limit of 100 responsibilities." }, 409);
    return json({ responsibility: { id, ...input, revision: 1, updatedAt } }, 201);
  }
  if (!raw || typeof raw.id !== "string" || !Number.isInteger(raw.revision) || Number(raw.revision) < 1) return json({ error: "The responsibility is invalid. Reload the list and try again." }, 400);
  const result = await env.DB!.prepare("UPDATE responsibilities SET title = ?, start_date = ?, end_date = ?, notes = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND profile_id = ? AND revision = ?")
    .bind(input.title, input.startDate, input.endDate, input.notes, updatedAt, raw.id, input.profileId, raw.revision).run();
  if (!result.meta.changes) return json({ error: "This responsibility changed or was removed. Refresh the list before editing again." }, 409);
  return json({ responsibility: { id: raw.id, ...input, revision: Number(raw.revision) + 1, updatedAt } });
}
async function handle(request: Request) {
  try { return cors(await (request.method === "GET" ? read() : write(request)), request); }
  catch (error) {
    console.error("Responsibilities request failed", error);
    return cors(json({ error: "Responsibilities could not be loaded or saved. Please try again." }, 503), request);
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export function OPTIONS(request: Request) {
  if (!allowedOrigin(request)) return json({ error: "This origin is not allowed." }, 403);
  return cors(new Response(null, { status: 204, headers: { "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" } }), request);
}

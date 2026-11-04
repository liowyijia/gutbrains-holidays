import { env } from "cloudflare:workers";
import { DAYS, type TeamResponse } from "@/lib/calendar";

export const dynamic = "force-dynamic";
const daySet = new Set(DAYS);
const externalOrigins = new Set(["https://liowyijia.github.io", "https://yijialiow.com"]);
type Stored = { id: string; name: string; days: string; revision: number; updated_at: string };
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function publicRow(row: Stored): TeamResponse {
  return { id: row.id, name: row.name, days: JSON.parse(row.days), revision: row.revision, updatedAt: row.updated_at };
}
function validate(input: unknown): { name: string; nameKey: string; days: string[] } | null {
  if (!input || typeof input !== "object") return null;
  const { name, days } = input as Record<string, unknown>;
  if (typeof name !== "string" || /[\p{C}]/u.test(name)) return null;
  const cleanName = name.trim().replace(/\s+/g, " ").normalize("NFKC");
  if (cleanName.length < 2 || cleanName.length > 60 || !Array.isArray(days) || days.length > 49 || days.some(d => typeof d !== "string" || !daySet.has(d))) return null;
  return { name: cleanName, nameKey: cleanName.toLocaleLowerCase("en-US"), days: [...new Set(days)].sort() };
}
async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  const text = await request.text();
  if (text.length > 6000) return null;
  try { return JSON.parse(text); } catch { return null; }
}
function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && (origin === new URL(request.url).origin || externalOrigins.has(origin));
}
async function getResponses() {
  try {
    const result = await env.DB!.prepare("SELECT id, name, days, revision, updated_at FROM responses ORDER BY name_key").all<Stored>();
    return json({ responses: result.results.map(publicRow) });
  } catch (error) {
    console.error("Calendar read failed", error);
    return json({ error: "The calendar could not load. Please try again." }, 503);
  }
}
async function createResponse(request: Request) {
  if (!allowedOrigin(request)) return json({ error: "Please save from this calendar's website." }, 403);
  const input = validate(await body(request));
  if (!input) return json({ error: "Enter a name (2–60 characters) and select dates within the holiday period." }, 400);
  const id = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  try {
    // The legacy token column remains for schema compatibility. Profiles now
    // deliberately use the calendar's shared, name-only editing model.
    const result = await env.DB!.prepare("INSERT INTO responses (id, name, name_key, edit_token_hash, days, revision, updated_at) SELECT ?, ?, ?, '', ?, 1, ? WHERE (SELECT COUNT(*) FROM responses) < 200")
      .bind(id, input.name, input.nameKey, JSON.stringify(input.days), updatedAt).run();
    if (!result.meta.changes) return json({ error: "This calendar has reached its response limit." }, 409);
    return json({ response: { id, name: input.name, days: input.days, revision: 1, updatedAt } }, 201);
  } catch (error) {
    if (String(error).includes("UNIQUE")) return json({ error: "That name already has a profile. Select it under Your profile to edit its dates, or add an initial if you share the same name." }, 409);
    console.error("Calendar save failed", error);
    return json({ error: "Your schedule could not be saved. Please try again." }, 503);
  }
}
async function updateResponse(request: Request) {
  if (!allowedOrigin(request)) return json({ error: "Please save from this calendar's website." }, 403);
  const raw = await body(request);
  const input = validate(raw);
  if (!input || typeof raw.id !== "string" || !Number.isInteger(raw.revision)) return json({ error: "The schedule is invalid. Reload the calendar and try again." }, 400);
  try {
    const existing = await env.DB!.prepare("SELECT id FROM responses WHERE id = ?").bind(raw.id).first<{ id: string }>();
    if (!existing) return json({ error: "This profile could not be found. Reload the calendar." }, 404);
    const updatedAt = new Date().toISOString();
    const result = await env.DB!.prepare("UPDATE responses SET name = ?, name_key = ?, days = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?")
      .bind(input.name, input.nameKey, JSON.stringify(input.days), updatedAt, raw.id, raw.revision).run();
    if (!result.meta.changes) return json({ error: "This response changed in another tab or device. Reload your saved schedule before editing again." }, 409);
    return json({ response: { id: raw.id, name: input.name, days: input.days, revision: raw.revision + 1, updatedAt } });
  } catch (error) {
    if (String(error).includes("UNIQUE")) return json({ error: "That name already has a response. Please add an initial to your name." }, 409);
    console.error("Calendar update failed", error);
    return json({ error: "Your changes could not be saved. Please try again." }, 503);
  }
}

function cors(response: Response, request: Request) {
  response.headers.set("Vary", "Origin");
  const origin = request.headers.get("origin");
  if (origin && externalOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  return response;
}
export async function GET(request: Request) {
  return cors(await getResponses(), request);
}
export async function POST(request: Request) {
  return cors(await createResponse(request), request);
}
export async function PUT(request: Request) {
  return cors(await updateResponse(request), request);
}
export function OPTIONS(request: Request) {
  if (!allowedOrigin(request)) return json({ error: "This origin is not allowed." }, 403);
  const response = new Response(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "600");
  return cors(response, request);
}

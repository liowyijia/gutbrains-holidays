import type { EditIdentity } from "./calendar";

export function validProfileId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
}

export function validIdentity(value: unknown): value is EditIdentity {
  return !!value && typeof value === "object" && "id" in value && "token" in value && validProfileId(value.id) && typeof value.token === "string" && /^[a-f0-9]{64}$/.test(value.token);
}

export function identityFromFragment(fragment: string): EditIdentity | null {
  const edit = new URLSearchParams(fragment.replace(/^#/, "")).get("edit");
  if (!edit) return null;
  const parts = edit.split(".");
  const value = { id: parts[0], token: parts[1] };
  return parts.length === 2 && validIdentity(value) ? value : null;
}

export function profileFromFragment(fragment: string): string | null {
  const profile = new URLSearchParams(fragment.replace(/^#/, "")).get("profile");
  if (validProfileId(profile)) return profile;
  return identityFromFragment(fragment)?.id ?? null;
}

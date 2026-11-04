import type { EditIdentity } from "./calendar";

export function validIdentity(value: unknown): value is EditIdentity {
  return !!value && typeof value === "object" && "id" in value && "token" in value && typeof value.id === "string" && /^[a-f0-9-]{36}$/.test(value.id) && typeof value.token === "string" && /^[a-f0-9]{64}$/.test(value.token);
}

export function identityFromFragment(fragment: string): EditIdentity | null {
  const edit = new URLSearchParams(fragment.replace(/^#/, "")).get("edit");
  if (!edit) return null;
  const parts = edit.split(".");
  const value = { id: parts[0], token: parts[1] };
  return parts.length === 2 && validIdentity(value) ? value : null;
}

export function privateEditLink(baseUrl: string, identity: EditIdentity): string {
  const url = new URL(baseUrl);
  url.hash = `edit=${identity.id}.${identity.token}`;
  return url.href;
}

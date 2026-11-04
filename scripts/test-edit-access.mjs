import assert from "node:assert/strict";
import { identityFromFragment, privateEditLink } from "../lib/edit-access.ts";

const identity = { id: "a1b2c3d4-1234-4567-89ab-123456789abc", token: "ab".repeat(32) };
const base = "https://yijialiow.com/gutbrains-holidays/";
const url = new URL(privateEditLink(base, identity));
assert.equal(url.origin + url.pathname, base);
assert.equal(url.search, "", "Edit credentials must stay out of server query strings");
assert.deepEqual(identityFromFragment(url.hash), identity, "Another browser must recover the exact edit identity");
assert.equal(new URL(url.pathname + url.search, url.origin).href, base, "Removing the imported fragment must leave a safe public address");
for (const fragment of ["", "#edit=bad", `#edit=${identity.id}.short`, `#edit=${identity.id}.${identity.token}.extra`, `#edit=../.${identity.token}`]) {
  assert.equal(identityFromFragment(fragment), null, "Malformed edit links must be rejected");
}
console.log("PASS: cross-device edit-link round trip, project path, fragment-only credentials, invalid-link rejection.");
